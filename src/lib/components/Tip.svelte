<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    x: number;
    y: number;
    children: Snippet;
  }

  // x and y are fractions of the chart's box, so the tip follows it at any size
  let { x, y, children }: Props = $props();
</script>

<div
  class="tip"
  class:left={x > 0.6}
  style:left="{x * 100}%"
  style:top="{y * 100}%"
  role="status"
  aria-live="polite"
>
  {@render children()}
</div>

<style>
  .tip {
    position: absolute;
    z-index: 2;
    translate: 12px -50%;
    min-width: 9rem;
    padding: var(--space-2) var(--space-3);
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius);
    background: var(--plate);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.16);
    font-size: 0.85rem;
    line-height: 1.35;
    pointer-events: none;
    white-space: nowrap;

    &.left {
      translate: calc(-100% - 12px) -50%;
    }
  }
</style>
