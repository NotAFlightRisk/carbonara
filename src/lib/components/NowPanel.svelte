<script lang="ts">
  import { bandOf } from '#lib/bands.js';
  import { latest, placeName, valueAt, type Track } from '#lib/story.js';
  import { DAY, clock } from '#lib/time.js';
  import type { History } from '#lib/types.js';
  import Barometer from './Barometer.svelte';
  import Plate from './Plate.svelte';
  import Switch from './Switch.svelte';

  interface Props {
    track: Track | null;
    gb: Track | null;
    history: History | null;
    region: number;
    now: number;
  }

  let { track, gb, history, region, now }: Props = $props();

  type Against = 'yesterday' | 'week' | 'first' | 'gb';
  let against = $state<Against>('yesterday');

  const reading = $derived(track ? latest(track, now) : null);
  const firstYear = $derived(history?.years[0]);

  const choices = $derived.by(() => {
    const options: { value: Against; label: string; compare: number | null; says: string }[] = [
      {
        value: 'yesterday',
        label: 'Yesterday',
        compare: track && reading ? valueAt(track, reading.time - DAY) : null,
        says: 'this time yesterday'
      }
    ];
    if (region) {
      options.push({
        value: 'gb',
        label: 'All of GB',
        compare: gb && reading ? valueAt(gb, reading.time) : null,
        says: 'Great Britain as a whole'
      });
    } else {
      options.push(
        {
          value: 'week',
          label: 'Last week',
          compare: track && reading ? valueAt(track, reading.time - 7 * DAY) : null,
          says: 'this time last week'
        },
        {
          value: 'first',
          label: String(firstYear?.year ?? 2017),
          compare: firstYear?.average ?? null,
          says: `the ${firstYear?.year} average for this time of year`
        }
      );
    }
    return options.filter((option) => option.compare != null);
  });

  const chosen = $derived(choices.find((option) => option.value === against) ?? choices[0]);

  $effect(() => {
    if (!choices.some((option) => option.value === against) && choices[0])
      against = choices[0].value;
  });

  const title = $derived(reading ? bandOf(reading.value).mood : 'Right now');
  const place = $derived(placeName(region));
  const estimate = $derived(!reading || !track || reading.time > track.lastActual);
</script>

<Plate
  id="now"
  {title}
  note={reading
    ? `${place} at ${clock(reading.time)}${estimate ? ', forecast until the reading lands' : ''}`
    : undefined}
  missing={!reading}
>
  {#snippet tools()}
    {#if choices.length > 1}
      <Switch
        label="Compare with"
        options={choices.map(({ value, label }) => ({ value, label }))}
        bind:value={against}
      />
    {/if}
  {/snippet}

  {#if reading}
    <Barometer
      value={reading.value}
      {place}
      compare={chosen?.compare != null ? { value: chosen.compare, label: chosen.says } : null}
    />
  {/if}
</Plate>
