<script lang="ts">
  import { area, curveMonotoneX, stack, stackOffsetExpand } from 'd3-shape';
  import { FUEL_NAMES, fuelColour } from '#lib/fuels.js';
  import { biggestSwing } from '#lib/story.js';
  import { HALF_HOUR, clock } from '#lib/time.js';
  import { FUELS, type Fuel, type Mix, type Snapshot } from '#lib/types.js';
  import Plate from './Plate.svelte';
  import Tip from './Tip.svelte';

  interface Props {
    mix: Snapshot['mix'];
  }

  let { mix }: Props = $props();

  let width = $state(0);
  let cursor = $state<number | null>(null);
  let focus = $state<Fuel | null>(null);

  const height = $derived(width < 560 ? 220 : 260);
  const pad = { left: 0, right: 0, top: 4, bottom: 26 };

  const known = $derived(
    mix
      ? mix.values
          .map((value, index) => ({ index, value }))
          .filter((row): row is { index: number; value: Mix } => row.value !== null)
      : []
  );
  const last = $derived(mix ? mix.values.length - 1 : 1);
  const x = (index: number) => pad.left + (index / last) * (width - pad.left - pad.right);
  const y = (share: number) => pad.top + (1 - share) * (height - pad.top - pad.bottom);

  const layers = $derived(
    stack<{ index: number; value: Mix }, Fuel>()
      .keys([...FUELS])
      .value((row, fuel) => row.value[fuel])
      .offset(stackOffsetExpand)(known)
  );
  const shape = $derived(
    area<[number, number] & { data: { index: number } }>()
      .x((point) => x(point.data.index))
      .y0((point) => y(point[0]))
      .y1((point) => y(point[1]))
      .curve(curveMonotoneX)
  );

  const swing = $derived(mix ? biggestSwing(mix.values) : null);
  const title = $derived(
    swing && Math.abs(swing.change) >= 3
      ? `${FUEL_NAMES[swing.fuel]} ${swing.change > 0 ? 'up' : 'down'} ${Math.round(Math.abs(swing.change))} points on yesterday`
      : 'A steady day for the mix'
  );

  const labelled = $derived(
    layers.filter((layer) => {
      const end = layer.at(-1);
      return end && (end[1] - end[0]) * (height - pad.top - pad.bottom) > 16;
    })
  );

  const timeOf = (index: number) => mix!.start + index * HALF_HOUR;

  function point(event: PointerEvent) {
    const box = (event.currentTarget as SVGElement).getBoundingClientRect();
    const index = Math.round(((event.clientX - box.left) / box.width) * last);
    cursor = mix?.values[index] ? index : null;
  }

  function describe(index: number) {
    const reading = mix?.values[index];
    if (!reading) return 'no data';
    const shares = FUELS.filter((fuel) => reading[fuel] >= 1).map(
      (fuel) => `${FUEL_NAMES[fuel]} ${Math.round(reading[fuel])}%`
    );
    return `${clock(timeOf(index))}: ${shares.join(', ')}`;
  }

  function step(event: KeyboardEvent) {
    if (event.key === 'Escape') cursor = null;
    const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!move || !known.length) return;
    event.preventDefault();
    const at = (cursor ?? known.at(-1)!.index) + move;
    if (mix?.values[at]) cursor = at;
  }
</script>

<Plate
  id="stream"
  {title}
  note="How Great Britain's mix moved over the last 24 hours"
  missing={known.length < 2}
>
  <div class="chart" bind:clientWidth={width}>
    {#if width}
      <svg
        {width}
        {height}
        role="slider"
        tabindex="0"
        aria-label="Share of generation by fuel over the last 24 hours"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={cursor ?? last}
        aria-valuetext={describe(cursor ?? known.at(-1)?.index ?? 0)}
        onpointermove={point}
        onpointerleave={() => (cursor = null)}
        onkeydown={step}
        onblur={() => (cursor = null)}
      >
        {#each layers as layer (layer.key)}
          <path
            class="layer"
            class:dim={focus && focus !== layer.key}
            d={shape(layer as never)}
            fill={fuelColour(layer.key)}
          />
        {/each}
        {#each labelled as layer (layer.key)}
          {@const end = layer.at(-1)!}
          <text class="label" x={width - 8} y={y((end[0] + end[1]) / 2)}
            >{FUEL_NAMES[layer.key]}</text
          >
        {/each}
        {#each [0, 0.25, 0.5, 0.75, 1] as fraction (fraction)}
          {@const index = Math.round(fraction * last)}
          <text
            class="hour"
            x={x(index)}
            y={height - 8}
            text-anchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}
          >
            {fraction === 1 ? 'now' : clock(timeOf(index))}
          </text>
        {/each}
        {#if cursor != null}
          <line class="cross" x1={x(cursor)} x2={x(cursor)} y1={pad.top} y2={height - pad.bottom} />
        {/if}
      </svg>
      {#if cursor != null && mix?.values[cursor]}
        {@const reading = mix.values[cursor]!}
        <Tip x={x(cursor) / width} y={0.45}>
          <strong>{clock(timeOf(cursor))}</strong>
          {#each FUELS.filter((fuel) => reading[fuel] >= 1) as fuel (fuel)}
            <span class="row"
              ><span class="key" style:background={fuelColour(fuel)}></span>{FUEL_NAMES[fuel]}
              {Math.round(reading[fuel])}%</span
            >
          {/each}
        </Tip>
      {/if}
    {/if}
  </div>

  <ul class="legend">
    {#each FUELS as fuel (fuel)}
      <li
        onpointerenter={() => (focus = fuel)}
        onpointerleave={() => (focus = null)}
        class:dim={focus && focus !== fuel}
      >
        <span class="key" style:background={fuelColour(fuel)}></span>{FUEL_NAMES[fuel]}
      </li>
    {/each}
  </ul>
</Plate>

<style>
  .chart {
    position: relative;
    min-height: 220px;

    svg {
      display: block;
      overflow: visible;
      touch-action: pan-y;
    }
  }

  .layer {
    stroke: var(--plate);
    stroke-width: 1;
    transition: opacity var(--quick) var(--ease-out);

    &.dim {
      opacity: 0.2;
    }
  }

  .label {
    fill: var(--on-fill);
    font-size: 11px;
    font-weight: 650;
    text-anchor: end;
    dominant-baseline: central;
    paint-order: stroke;
    stroke: rgb(0 0 0 / 0.35);
    stroke-width: 2.5px;
    pointer-events: none;
  }

  .hour {
    fill: var(--ink-soft);
    font-size: 11px;
    font-stretch: var(--narrow);
  }

  .cross {
    stroke: var(--ink);
    stroke-width: 1.5;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .key {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
    font-stretch: var(--narrow);

    li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      transition: opacity var(--quick) var(--ease-out);

      &.dim {
        opacity: 0.4;
      }
    }
  }
</style>
