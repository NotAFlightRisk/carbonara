<script lang="ts">
  import { curveMonotoneX, line } from 'd3-shape';
  import { BANDS, bandOf, colourOf } from '#lib/bands.js';
  import { bestWindow, indexAt, mean, placeName, type Track } from '#lib/story.js';
  import { DAY, HALF_HOUR, clock, day, halfHourOfDay, when } from '#lib/time.js';
  import Plate from './Plate.svelte';
  import Switch from './Switch.svelte';
  import Tip from './Tip.svelte';

  interface Props {
    track: Track | null;
    region: number;
    now: number;
  }

  let { track, region, now }: Props = $props();

  const HOURS = [1, 2, 3, 4, 6, 8];
  let hours = $state(3);
  let view = $state<'trace' | 'clock'>('trace');
  let width = $state(0);
  let cursor = $state<number | null>(null);

  const first = $derived(track ? Math.max(0, indexAt(track, now - DAY)) : 0);
  const current = $derived(track ? indexAt(track, now) : 0);
  const last = $derived(track ? track.values.length - 1 : 0);
  const slots = $derived(hours * 2);
  const best = $derived(track ? bestWindow(track.values, current, slots) : null);
  const startingNow = $derived.by(() => {
    const window = track?.values.slice(current, current + slots) ?? [];
    return window.every((value) => value != null) ? mean(window as number[]) : null;
  });
  const timeOf = (index: number) => track!.start + index * HALF_HOUR;

  const saving = $derived(best && startingNow ? (1 - best.average / startingNow) * 100 : null);
  // waiting for a saving you'd never notice isn't worth anyone's evening
  const worthWaiting = $derived(
    best != null && best.index !== current && (saving == null || saving >= 5)
  );

  const title = $derived.by(() => {
    if (!best) return 'Best time to plug in';
    if (!worthWaiting) return "Now's about as good as it gets";
    return `Best to wait until ${when(timeOf(best.index), now)}`;
  });

  // the trace, drawn in real pixels so the type stays legible on a phone
  const height = $derived(width < 560 ? 230 : 280);
  const pad = { left: 6, right: 64, top: 30, bottom: 40 };
  const top = $derived(
    track
      ? Math.max(
          200,
          Math.ceil(Math.max(...track.values.slice(first).map((v) => v ?? 0)) / 50) * 50
        )
      : 300
  );
  const x = (index: number) =>
    pad.left + ((index - first) / Math.max(1, last - first)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - value / top) * (height - pad.top - pad.bottom);

  const lastReal = $derived(track ? Math.min(current, indexAt(track, track.lastActual)) : 0);
  const trace = $derived.by(() => {
    if (!track || !width) return { known: '', ahead: '' };
    const draw = line<number>()
      .defined((index) => track.values[index] != null)
      .x(x)
      .y((index) => y(track.values[index]!))
      .curve(curveMonotoneX);
    const range = (from: number, to: number) =>
      Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
    return { known: draw(range(first, lastReal)) ?? '', ahead: draw(range(lastReal, last)) ?? '' };
  });

  const midnights = $derived.by(() => {
    if (!track) return [];
    const marks: { index: number; label: string }[] = [];
    for (let index = first; index <= last; index++) {
      if (halfHourOfDay(timeOf(index)) === 0) marks.push({ index, label: day(timeOf(index)) });
    }
    return marks;
  });

  const zones = $derived(
    BANDS.map((band, i) => {
      const floor = i ? BANDS[i - 1].below : 0;
      const ceiling = Math.min(band.below, top);
      return { band, floor, middle: (floor + ceiling) / 2, tall: y(floor) - y(ceiling) };
    }).filter(({ floor }) => floor < top)
  );

  function point(event: PointerEvent) {
    const box = (event.currentTarget as SVGElement).getBoundingClientRect();
    const fraction = (event.clientX - box.left - pad.left) / (box.width - pad.left - pad.right);
    cursor = Math.round(first + Math.min(1, Math.max(0, fraction)) * (last - first));
  }

  function describe(index: number) {
    const value = track?.values[index];
    if (value == null) return `${clock(timeOf(index))}, no data`;
    const kind = index > lastReal ? 'forecast' : 'reading';
    return `${day(timeOf(index))} ${clock(timeOf(index))}, ${Math.round(value)} grams, ${bandOf(value).name}, ${kind}`;
  }

  function step(event: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      PageDown: -12,
      PageUp: 12
    };
    if (event.key === 'Escape') cursor = null;
    if (!(event.key in moves)) return;
    event.preventDefault();
    cursor = Math.min(last, Math.max(first, (cursor ?? current) + moves[event.key]));
  }

  // the clock face: the next 24 hours, laid where they fall on a London clock
  const R = 112;
  const C = 150;
  const polar = (slot: number, radius: number) => {
    const angle = (slot / 48) * Math.PI * 2 - Math.PI / 2;
    return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
  };
  const wedge = (from: number, to: number, inner: number, outer: number) => {
    const [a, b] = [polar(from, outer), polar(to, outer)];
    const [c, d] = [polar(to, inner), polar(from, inner)];
    const big = to - from > 24 ? 1 : 0;
    return `M${a}A${outer} ${outer} 0 ${big} 1 ${b}L${c}A${inner} ${inner} 0 ${big} 0 ${d}Z`;
  };
  const day24 = $derived(
    track
      ? Array.from({ length: 48 }, (_, i) => ({
          index: current + i,
          slot: halfHourOfDay(timeOf(current + i)),
          value: track.values[current + i] ?? null
        }))
      : []
  );
  const bestInDay = $derived(best && best.index + slots <= current + 48 ? best : null);
  const hand = $derived.by(() => {
    const slot = halfHourOfDay(now) + (now % HALF_HOUR) / HALF_HOUR;
    return { from: polar(slot, R - 40), to: polar(slot, R + 4) };
  });
</script>

<Plate
  id="plan"
  {title}
  note="When {placeName(region)}'s grid is cleanest for the next 48 hours"
  missing={!track || !best}
>
  {#snippet tools()}
    <Switch
      label="Show as"
      options={[
        { value: 'trace', label: 'Trace' },
        { value: 'clock', label: 'Clock' }
      ]}
      bind:value={view}
    />
  {/snippet}

  {#if track && best}
    <div class="ask">
      <Switch
        label="How long does it run for?"
        options={HOURS.map((value) => ({ value, label: `${value}h` }))}
        bind:value={hours}
      />
      <p>
        Got something that runs for {hours} hour{hours > 1 ? 's' : ''}?
        {#if worthWaiting}
          Start it at <strong>{when(timeOf(best.index), now)}</strong> and it'll average
          {Math.round(best.average)} g{#if saving != null}, {Math.round(saving)}% less than starting
            now{/if}.
        {:else if best.index === current}
          Start it now, it won't get any cleaner than {Math.round(best.average)} g.
        {:else}
          Start it now. Waiting until {when(timeOf(best.index), now)} only saves
          {Math.max(Math.round(saving ?? 0), 0)}%.
        {/if}
      </p>
    </div>

    {#if view === 'trace'}
      <div class="trace" bind:clientWidth={width}>
        {#if width}
          <svg
            {width}
            {height}
            role="slider"
            tabindex="0"
            aria-label="Carbon intensity from 24 hours ago to 48 hours ahead"
            aria-valuemin={first}
            aria-valuemax={last}
            aria-valuenow={cursor ?? current}
            aria-valuetext={describe(cursor ?? current)}
            onpointermove={point}
            onpointerleave={() => (cursor = null)}
            onkeydown={step}
            onblur={() => (cursor = null)}
          >
            {#each zones as zone (zone.band.id)}
              <line
                class="threshold"
                x1={pad.left}
                x2={width - pad.right}
                y1={y(zone.floor)}
                y2={y(zone.floor)}
              />
              {#if zone.tall > 14}
                <text class="zone" x={width - pad.right + 8} y={y(zone.middle)}
                  >{zone.band.name}</text
                >
              {/if}
            {/each}
            {#each midnights as mark (mark.index)}
              <line
                class="midnight"
                x1={x(mark.index)}
                x2={x(mark.index)}
                y1={pad.top - 6}
                y2={height - pad.bottom}
              />
              <text class="day" x={x(mark.index) + 4} y={pad.top - 10}>{mark.label}</text>
            {/each}

            <rect
              class="window"
              x={x(best.index)}
              y={pad.top}
              width={x(best.index + slots) - x(best.index)}
              height={height - pad.top - pad.bottom}
            />
            <path
              class="bracket"
              d="M{x(best.index)} {pad.top + 8}V{pad.top}H{x(best.index + slots)}V{pad.top + 8}"
            />

            <path class="known" d={trace.known} />
            <path class="ahead" d={trace.ahead} />

            {#each track.values.slice(first) as value, i (i)}
              {#if value != null}
                <rect
                  class="cell"
                  x={x(first + i) - (width - pad.left - pad.right) / (last - first) / 2}
                  y={height - pad.bottom + 6}
                  width={Math.max(1, (width - pad.left - pad.right) / (last - first) - 1)}
                  height="9"
                  fill={colourOf(value)}
                />
              {/if}
            {/each}

            <line
              class="now"
              x1={x(current)}
              x2={x(current)}
              y1={pad.top}
              y2={height - pad.bottom + 15}
            />
            <text class="now-label" x={x(current)} y={height - 6}>now</text>
            {#each [-24, -12, 12, 24, 36] as offset (offset)}
              {@const index = current + offset * 2}
              {#if index >= first && index <= last && Math.abs(x(index) - x(current)) > 40}
                <text class="hour" x={x(index)} y={height - 6}>{clock(timeOf(index))}</text>
              {/if}
            {/each}

            {#if cursor != null && track.values[cursor] != null}
              <line
                class="cross"
                x1={x(cursor)}
                x2={x(cursor)}
                y1={pad.top}
                y2={height - pad.bottom}
              />
              <circle class="dot" cx={x(cursor)} cy={y(track.values[cursor]!)} r="4.5" />
            {/if}
          </svg>
          {#if cursor != null && track.values[cursor] != null}
            {@const value = track.values[cursor]!}
            <Tip x={x(cursor) / width} y={y(value) / height}>
              <strong>{day(timeOf(cursor))}, {clock(timeOf(cursor))}</strong><br />
              {Math.round(value)} g · {bandOf(value).name}<br />
              <span class="soft">{cursor > lastReal ? 'forecast' : 'reading'}</span>
            </Tip>
          {/if}
        {/if}
      </div>
    {:else}
      <div class="clock">
        <svg
          viewBox="-12 -12 324 324"
          role="img"
          aria-label="The next 24 hours on a clock face, coloured by how clean the grid will be"
        >
          {#each day24 as part (part.index)}
            {#if part.value != null}
              <path
                class="segment"
                d={wedge(part.slot, part.slot + 1, R - 26, R)}
                fill={colourOf(part.value)}
              >
                <title
                  >{clock(timeOf(part.index))}: {Math.round(part.value)} g, {bandOf(part.value)
                    .name}</title
                >
              </path>
            {/if}
          {/each}
          {#if bestInDay}
            {@const from = halfHourOfDay(timeOf(bestInDay.index))}
            <path class="best-arc" d={wedge(from, from + slots, R + 6, R + 11)} />
          {/if}
          {#each [0, 12, 24, 36] as slot (slot)}
            {@const [lx, ly] = polar(slot, R + 22)}
            <text class="hour" x={lx} y={ly}>{String(slot / 2).padStart(2, '0')}</text>
          {/each}
          <line class="hand" x1={hand.from[0]} y1={hand.from[1]} x2={hand.to[0]} y2={hand.to[1]} />
          {#if bestInDay}
            <text class="centre" x={C} y={C - 14}>best {hours}h</text>
            <text class="centre big" x={C} y={C + 14}>{clock(timeOf(bestInDay.index))}</text>
          {/if}
        </svg>
        <p class="soft">Starts at the hand and runs round once, so the next 24 hours.</p>
      </div>
    {/if}
  {/if}
</Plate>

<style>
  .ask {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-5);

    p {
      flex: 1 1 22rem;
      max-width: 60ch;
      color: var(--ink-soft);

      strong {
        color: var(--plan);
      }
    }
  }

  .trace {
    position: relative;
    min-height: 230px;

    svg {
      display: block;
      overflow: visible;
      touch-action: pan-y;
      border-radius: var(--radius);
    }
  }

  .threshold {
    stroke: var(--grid);
  }

  .zone,
  .day,
  .hour,
  .now-label {
    fill: var(--ink-soft);
    font-size: 11px;
    font-stretch: var(--narrow);
  }

  .zone {
    dominant-baseline: central;
  }

  .day {
    font-weight: 600;
  }

  .hour,
  .now-label {
    text-anchor: middle;
  }

  .now-label {
    fill: var(--ink);
    font-weight: 700;
  }

  .midnight {
    stroke: var(--rule);
  }

  .window {
    fill: var(--plan-wash);
  }

  .bracket {
    fill: none;
    stroke: var(--plan);
    stroke-width: 2;
  }

  .known,
  .ahead {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .ahead {
    stroke: var(--ink-soft);
    stroke-dasharray: 4 3;
  }

  .now {
    stroke: var(--ink);
  }

  .cross {
    stroke: var(--ink-faint);
  }

  .dot {
    fill: var(--ink);
    stroke: var(--plate);
    stroke-width: 2;
  }

  .clock {
    display: grid;
    justify-items: center;
    gap: var(--space-2);

    svg {
      width: min(100%, 340px);
    }

    .hour {
      dominant-baseline: central;
    }
  }

  .segment {
    stroke: var(--plate);
    stroke-width: 1;
  }

  .best-arc {
    fill: var(--plan);
  }

  .hand {
    stroke: var(--ink);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .centre {
    fill: var(--ink-soft);
    font-size: 13px;
    text-anchor: middle;

    &.big {
      fill: var(--plan);
      font-size: 30px;
      font-weight: 700;
    }
  }

  .soft {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
</style>
