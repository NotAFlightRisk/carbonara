<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { elasticOut, cubicInOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { MediaQuery } from 'svelte/reactivity';
  import { BANDS, SCALE_MAX, bandOf, swatch } from '#lib/bands.js';

  interface Props {
    value: number;
    compare: { value: number; label: string } | null;
    place: string;
  }

  let { value, compare, place }: Props = $props();

  const SWEEP = 240;
  const [CX, CY] = [200, 196];
  const calm = new MediaQuery('prefers-reduced-motion: reduce');

  const angleOf = (reading: number) =>
    -SWEEP / 2 + (Math.min(Math.max(reading, 0), SCALE_MAX) / SCALE_MAX) * SWEEP;

  const point = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
  };

  const arc = (from: number, to: number, radius: number) => {
    const [x1, y1] = point(from, radius);
    const [x2, y2] = point(to, radius);
    return `M${x1} ${y1}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  // a hair of surface between bands, so neighbours never smear together
  const GAP = 0.6;
  const bands = BANDS.map((band, i) => {
    const from = angleOf(i ? BANDS[i - 1].below : 0) + (i ? GAP : 0);
    const to = angleOf(Math.min(band.below, SCALE_MAX)) - (i < BANDS.length - 1 ? GAP : 0);
    return { band, from, to };
  });

  const ticks = Array.from({ length: SCALE_MAX / 10 + 1 }, (_, i) => i * 10);

  const needle = new Tween(
    untrack(() => angleOf(value)),
    { duration: 900, easing: cubicInOut }
  );
  const setHand = new Tween(
    untrack(() => angleOf(compare?.value ?? value)),
    {
      duration: 700,
      easing: cubicInOut
    }
  );

  $effect(() => {
    needle.set(angleOf(value), { duration: calm.current ? 0 : 900 });
  });

  $effect(() => {
    if (compare) setHand.set(angleOf(compare.value), { duration: calm.current ? 0 : 700 });
  });

  /** Like tapping a real barometer's glass, which shakes the needle loose onto the reading */
  function tap() {
    if (calm.current) return;
    needle.set(angleOf(value) + 9, { duration: 0 });
    needle.set(angleOf(value), { duration: 1600, easing: elasticOut });
  }

  onMount(tap);

  const band = $derived(bandOf(value));
  const difference = $derived(compare ? Math.round(value - compare.value) : 0);
</script>

<div class="barometer">
  <button
    type="button"
    class="glass"
    onclick={tap}
    aria-label="Carbon intensity in {place}: {Math.round(
      value
    )} grams per kilowatt hour, {band.name}. Tap the glass to settle the needle."
  >
    <svg viewBox="0 0 400 330" aria-hidden="true">
      <circle class="bezel" cx={CX} cy={CY} r="192" />
      {#each bands as { band: section, from, to } (section.id)}
        <path class="band" d={arc(from, to, 160)} style:stroke={swatch(section)} />
        <path id="word-{section.id}" d={arc(from - 8, to + 8, 176)} fill="none" />
        <text class="word" class:here={section === band}>
          <textPath href="#word-{section.id}" startOffset="50%" text-anchor="middle">
            {section.name}
          </textPath>
        </text>
      {/each}
      {#each ticks as tick (tick)}
        {@const major = tick % 50 === 0}
        {@const [x1, y1] = point(angleOf(tick), major ? 134 : 141)}
        {@const [x2, y2] = point(angleOf(tick), 150)}
        <line class="tick" class:major {x1} {y1} {x2} {y2} />
        {#if major}
          {@const [x, y] = point(angleOf(tick), 118)}
          <text class="numeral" {x} {y}>{tick}</text>
        {/if}
      {/each}
      {#if compare}
        {@const [hx, hy] = point(setHand.current, 168)}
        {@const [kx, ky] = point(setHand.current, 150)}
        <line class="set-hand" x1={CX} y1={CY} x2={hx} y2={hy} />
        <circle class="set-knob" cx={kx} cy={ky} r="4" />
      {/if}
      <g class="needle" style:rotate="{needle.current}deg">
        <path
          d="M{CX - 3.5} {CY + 30}L{CX - 1.2} {CY - 150}L{CX + 1.2} {CY - 150}L{CX + 3.5} {CY +
            30}Z"
        />
        <circle cx={CX} cy={CY + 24} r="7" />
      </g>
      <circle class="hub" cx={CX} cy={CY} r="9" />
      <circle class="hub-dot" cx={CX} cy={CY} r="2.5" />
      <text class="reading" x={CX} y={CY + 84}>{Math.round(value)}</text>
      <text class="unit" x={CX} y={CY + 106}>gCO₂ per kWh</text>
    </svg>
  </button>

  <p class="verdict">
    <span class="swatch" style:background={swatch(band)}></span>
    <strong>{band.name}</strong>
    {#if compare}
      <span class="versus">
        {#if Math.abs(difference) < 2}
          about the same as {compare.label}
        {:else}
          {Math.abs(difference)} g {difference < 0 ? 'cleaner' : 'dirtier'} than {compare.label}
        {/if}
      </span>
    {/if}
  </p>
</div>

<style>
  .barometer {
    display: grid;
    justify-items: center;
    gap: var(--space-3);
  }

  .glass {
    width: min(100%, 440px);
    padding: 0;
    border: 0;
    border-radius: 50% 50% 24px 24px;
    background: none;
    cursor: pointer;
  }

  svg {
    display: block;
    width: 100%;
    overflow: visible;
  }

  .bezel {
    fill: var(--plate-sunk);
    stroke: var(--rule);
  }

  .band {
    fill: none;
    stroke-width: 12;
  }

  .word {
    fill: var(--ink-soft);
    font-size: 10.5px;
    font-weight: 600;
    font-stretch: var(--wide);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: fill var(--quick) var(--ease-out);

    &.here {
      fill: var(--ink);
      font-weight: 800;
    }
  }

  .tick {
    stroke: var(--ink-faint);
    stroke-width: 1;

    &.major {
      stroke: var(--ink);
      stroke-width: 2;
    }
  }

  .numeral {
    fill: var(--ink-soft);
    font-size: 13px;
    font-weight: 500;
    text-anchor: middle;
    dominant-baseline: central;
  }

  .needle {
    transform-origin: 200px 196px;
    fill: var(--ink);
  }

  .set-hand {
    stroke: var(--plan);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }

  .set-knob {
    fill: var(--plan);
  }

  .hub {
    fill: var(--ink);
  }

  .hub-dot {
    fill: var(--plate-sunk);
  }

  .reading {
    fill: var(--ink);
    font-size: 64px;
    font-weight: 700;
    font-stretch: var(--narrow);
    letter-spacing: -0.02em;
    text-anchor: middle;
  }

  .unit {
    fill: var(--ink-soft);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-anchor: middle;
  }

  .verdict {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--space-1) var(--space-2);
    text-align: center;

    strong {
      font-stretch: var(--wide);
      font-weight: 750;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .versus {
    color: var(--ink-soft);
  }
</style>
