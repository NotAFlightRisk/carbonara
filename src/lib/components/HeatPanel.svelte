<script lang="ts">
  import { onMount } from 'svelte';
  import { bandOf, colourOf } from '#lib/bands.js';
  import { fortnight, halfHourLabel, type Track } from '#lib/story.js';
  import { weekday } from '#lib/time.js';
  import BandKey from './BandKey.svelte';
  import Plate from './Plate.svelte';
  import Tip from './Tip.svelte';

  interface Props {
    track: Track | null;
    now: number;
  }

  let { track, now }: Props = $props();

  let cursor = $state<{ row: number; slot: number } | null>(null);

  const weeks = $derived(track ? fortnight(track, now) : null);
  // the cells only ever draw in the browser
  let drawn = $state(false);
  onMount(() => (drawn = true));
  const rows = $derived(
    weeks
      ? [
          ...weeks.rows.map(({ date, cells }) => ({
            key: date,
            label: `${weekday(Date.parse(date))} ${Number(date.slice(8))}`,
            cells
          })),
          {
            key: 'usual',
            label: 'Usual',
            cells: weeks.usual.map((value) => (isNaN(value) ? null : value))
          }
        ]
      : []
  );

  const title = $derived(
    weeks?.cleanest != null
      ? `Usually cleanest around ${halfHourLabel(weeks.cleanest)}`
      : 'The last two weeks'
  );
  const note = $derived(
    weeks?.dirtiest != null
      ? `And dirtiest around ${halfHourLabel(weeks.dirtiest)}. Great Britain, last 14 days by time of day`
      : undefined
  );

  function pick(event: PointerEvent) {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    cursor = cell ? { row: Number(cell.dataset.row), slot: Number(cell.dataset.slot) } : null;
  }

  function describe({ row, slot }: { row: number; slot: number }) {
    const value = rows[row]?.cells[slot];
    const when = `${rows[row]?.label} ${halfHourLabel(slot)}`;
    return value == null
      ? `${when}, no data`
      : `${when}, ${Math.round(value)} grams, ${bandOf(value).name}`;
  }

  function step(event: KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0]
    };
    if (event.key === 'Escape') cursor = null;
    if (!moves[event.key]) return;
    event.preventDefault();
    const [down, across] = moves[event.key];
    const from = cursor ?? { row: rows.length - 1, slot: 0 };
    cursor = {
      row: Math.min(rows.length - 1, Math.max(0, from.row + down)),
      slot: Math.min(47, Math.max(0, from.slot + across))
    };
  }

  const picked = $derived(cursor ? rows[cursor.row]?.cells[cursor.slot] : null);
</script>

<Plate id="heat" {title} {note} missing={!weeks || weeks.rows.length < 2}>
  <div class="heat">
    {#if drawn}
      <div
        class="grid"
        role="slider"
        tabindex="0"
        aria-label="Carbon intensity for each half hour of the last 14 days. Up and down change the day"
        aria-valuemin={0}
        aria-valuemax={rows.length * 48 - 1}
        aria-valuenow={cursor ? cursor.row * 48 + cursor.slot : 0}
        aria-valuetext={cursor ? describe(cursor) : 'Pick a half hour with the arrow keys'}
        onpointermove={pick}
        onpointerleave={() => (cursor = null)}
        onkeydown={step}
        onblur={() => (cursor = null)}
      >
        {#each rows as row, r (row.key)}
          <span class="day" class:usual={row.key === 'usual'}>{row.label}</span>
          {#each row.cells as value, slot (slot)}
            <span
              class="cell"
              class:usual={row.key === 'usual'}
              class:on={cursor?.row === r && cursor.slot === slot}
              data-row={r}
              data-slot={slot}
              style:background={value != null ? colourOf(value) : null}
            ></span>
          {/each}
        {/each}
        <span></span>
        {#each Array.from({ length: 48 }, (_, slot) => slot) as slot (slot)}
          <span class="hour">{slot % 12 === 0 ? halfHourLabel(slot).slice(0, 2) : ''}</span>
        {/each}
      </div>
      {#if cursor && picked != null}
        <Tip x={(cursor.slot + 3) / 51} y={(cursor.row + 0.5) / (rows.length + 1)}>
          <strong
            >{rows[cursor.row].key === 'usual' ? 'Usual day' : rows[cursor.row].label}, {halfHourLabel(
              cursor.slot
            )}</strong
          ><br />
          {Math.round(picked)} g · {bandOf(picked).name}
        </Tip>
      {/if}
    {/if}
  </div>
  <BandKey />
</Plate>

<style>
  .heat {
    position: relative;
    min-height: 290px;
  }

  .grid {
    display: grid;
    grid-template-columns: 3.4rem repeat(48, minmax(0, 1fr));
    gap: 1px;
    border-radius: var(--radius);
  }

  .day {
    align-self: center;
    padding-right: var(--space-2);
    color: var(--ink-soft);
    font-size: 0.75rem;
    font-stretch: var(--narrow);
    white-space: nowrap;

    &.usual {
      margin-top: var(--space-2);
      color: var(--ink);
      font-weight: 650;
    }
  }

  .cell {
    height: 15px;
    background: var(--plate-sunk);

    &.usual {
      height: 22px;
      margin-top: var(--space-2);
    }

    &.on {
      outline: 2px solid var(--ink);
      outline-offset: -1px;
    }
  }

  .hour {
    padding-top: var(--space-1);
    color: var(--ink-soft);
    font-size: 0.7rem;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .grid {
      grid-template-columns: 2.6rem repeat(48, minmax(0, 1fr));
      gap: 0;
    }

    .day {
      font-size: 0.68rem;
    }

    .cell {
      height: 13px;
    }
  }
</style>
