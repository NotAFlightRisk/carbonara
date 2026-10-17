<script lang="ts">
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';
  import { MediaQuery } from 'svelte/reactivity';
  import { FUEL_NAMES, biggest, carbonShare, fuelColour, squares } from '#lib/fuels.js';
  import { FUELS, type Factors, type Fuel, type Mix } from '#lib/types.js';
  import Plate from './Plate.svelte';
  import Switch from './Switch.svelte';

  interface Props {
    mix: Mix | null;
    factors: Factors | null;
    intensity: number | null;
    place: string;
  }

  let { mix, factors, intensity, place }: Props = $props();

  const LEADS: Record<Fuel, string> = {
    wind: "Wind's doing most of the work",
    hydro: "Hydro's out in front, which is rare",
    solar: "Solar's out in front",
    biomass: 'Biomass is leading the way',
    imports: 'Imports are keeping the lights on',
    nuclear: "Nuclear's carrying it",
    gas: 'Gas is propping things up',
    other: "It's a bit of everything"
  };
  const LOW_CARBON: Fuel[] = ['wind', 'hydro', 'solar', 'nuclear'];

  let view = $state<'power' | 'carbon'>('power');
  let focus = $state<Fuel | null>(null);
  const calm = new MediaQuery('prefers-reduced-motion: reduce');

  const carbon = $derived(
    mix && factors && intensity != null ? carbonShare(mix, factors, intensity) : null
  );
  const shown = $derived(view === 'carbon' && carbon ? carbon : mix);

  $effect(() => {
    if (!carbon) view = 'power';
  });
  const counts = $derived(shown ? squares(shown) : null);
  const cells = $derived(
    counts
      ? FUELS.flatMap((fuel) => Array.from({ length: counts[fuel] }, (_, n) => ({ fuel, n })))
      : []
  );
  const listed = $derived(mix ? FUELS.filter((fuel) => mix[fuel] >= 0.5) : []);
  const lowCarbon = $derived(
    mix ? Math.round(LOW_CARBON.reduce((sum, fuel) => sum + mix[fuel], 0)) : 0
  );

  const title = $derived.by(() => {
    if (!mix) return "What's making it";
    if (view === 'carbon' && carbon) {
      const worst = biggest(carbon);
      const verb = worst === 'imports' ? 'make' : 'makes';
      return `${FUEL_NAMES[worst]} ${verb} about ${Math.round(carbon[worst])}% of the carbon`;
    }
    const lead = biggest(mix);
    return mix[lead] < 30 ? "No one fuel's in charge" : LEADS[lead];
  });

  const note = $derived(
    view === 'carbon'
      ? `Rough share of ${place}'s emissions, from the API's own fuel factors`
      : `What's powering ${place} now. ${lowCarbon}% low carbon`
  );

  const duration = $derived(calm.current ? 0 : 500);
</script>

<Plate id="mix" {title} {note} missing={!mix}>
  {#snippet tools()}
    {#if carbon}
      <Switch
        label="Show share of"
        options={[
          { value: 'power', label: 'Power' },
          { value: 'carbon', label: 'Carbon' }
        ]}
        bind:value={view}
      />
    {/if}
  {/snippet}

  <div class="body">
    <div
      class="waffle"
      role="img"
      aria-label="{listed
        .map((fuel) => `${FUEL_NAMES[fuel]} ${Math.round(shown![fuel])}%`)
        .join(', ')} of the {view}"
    >
      {#each cells as cell (`${cell.fuel}-${cell.n}`)}
        <span
          class="square"
          class:dim={focus && focus !== cell.fuel}
          style:background={fuelColour(cell.fuel)}
          animate:flip={{ duration }}
          transition:scale={{ duration, start: 0.2 }}
        ></span>
      {/each}
    </div>

    <ul class="legend">
      {#each listed as fuel (fuel)}
        <li>
          <button
            type="button"
            class:dim={focus && focus !== fuel}
            onpointerenter={() => (focus = fuel)}
            onpointerleave={() => (focus = null)}
            onfocus={() => (focus = fuel)}
            onblur={() => (focus = null)}
          >
            <span class="key" style:background={fuelColour(fuel)}></span>
            <span class="name">{FUEL_NAMES[fuel]}</span>
            <span class="share">{Math.round(shown![fuel])}%</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</Plate>

<style>
  .body {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(10rem, 13rem);
    align-items: center;
    justify-content: center;
    gap: var(--space-5) var(--space-6);
  }

  .waffle {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    width: 100%;
    aspect-ratio: 1;
  }

  .square {
    border-radius: 2px;
    transition: opacity var(--quick) var(--ease-out);

    &.dim {
      opacity: 0.18;
    }
  }

  .legend {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;

    button {
      display: grid;
      grid-template-columns: 12px 1fr auto;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      min-height: 32px;
      padding: var(--space-1) var(--space-2);
      border: 0;
      border-radius: var(--radius);
      background: none;
      text-align: left;
      cursor: default;
      transition: opacity var(--quick) var(--ease-out);

      &:hover,
      &:focus-visible {
        background: var(--plate-sunk);
      }

      &.dim {
        opacity: 0.45;
      }
    }
  }

  .key {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .name {
    font-stretch: var(--narrow);
  }

  .share {
    font-weight: 650;
  }

  @media (max-width: 520px) {
    .body {
      grid-template-columns: 1fr;
    }

    .legend {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
