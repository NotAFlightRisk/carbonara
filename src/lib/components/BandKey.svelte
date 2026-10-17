<script lang="ts">
  import { BANDS, swatch } from '#lib/bands.js';
</script>

<ul class="key" aria-label="What the colours mean">
  {#each BANDS as band (band.id)}
    <li><span class="swatch" style:background={swatch(band)}></span>{band.name}</li>
  {/each}
</ul>

<style>
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-stretch: var(--narrow);

    li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  }

  .swatch {
    width: 14px;
    height: 10px;
    border-radius: 2px;
  }
</style>
