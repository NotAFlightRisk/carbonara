<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    note?: string;
    missing?: boolean;
    tools?: Snippet;
    children: Snippet;
  }

  let { id, title, note, missing = false, tools, children }: Props = $props();
</script>

<section class="plate {id}" aria-labelledby="{id}-title">
  <header>
    <div class="titles">
      <h2 id="{id}-title">{title}</h2>
      {#if note}<p class="note">{note}</p>{/if}
    </div>
    {#if tools && !missing}{@render tools()}{/if}
  </header>
  {#if missing}
    <p class="missing">
      This bit of the grid's data didn't turn up. It'll have another go in a few minutes.
    </p>
  {:else}
    {@render children()}
  {/if}
</section>

<style>
  .plate {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
    padding: var(--space-5);
    background: var(--plate);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-3) var(--space-4);
  }

  .titles {
    display: grid;
    gap: var(--space-1);
    max-width: 52ch;
  }

  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
    font-stretch: var(--narrow);
  }

  .missing {
    flex: 1;
    display: grid;
    place-items: center;
    min-height: 160px;
    padding: var(--space-5);
    border: var(--hairline) dashed var(--rule);
    border-radius: var(--radius);
    color: var(--ink-soft);
    text-align: center;
  }

  @media (max-width: 640px) {
    .plate {
      padding: var(--space-5) var(--space-4);
    }
  }
</style>
