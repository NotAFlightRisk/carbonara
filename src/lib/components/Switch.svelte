<script lang="ts" generics="T extends string | number">
  interface Props {
    label: string;
    options: { value: T; label: string }[];
    value: T;
  }

  let { label, options, value = $bindable() }: Props = $props();
  const name = $props.id();
</script>

<fieldset class="switch">
  <legend class="sr-only">{label}</legend>
  {#each options as option (option.value)}
    <label class:on={value === option.value}>
      <input type="radio" {name} value={option.value} bind:group={value} />
      {option.label}
    </label>
  {/each}
</fieldset>

<style>
  .switch {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0;
    padding: 2px;
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius);
    background: var(--plate-sunk);
  }

  label {
    position: relative;
    padding: var(--space-1) var(--space-3);
    border-radius: calc(var(--radius) - 1px);
    color: var(--ink-soft);
    font-size: 0.85rem;
    font-weight: 550;
    font-stretch: var(--narrow);
    cursor: pointer;
    transition:
      background var(--quick) var(--ease-out),
      color var(--quick) var(--ease-out);

    &:hover {
      color: var(--ink);
    }

    &.on {
      background: var(--ink);
      color: var(--plate);
    }

    &:has(:focus-visible) {
      outline: 2px solid var(--plan);
      outline-offset: 1px;
    }
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
</style>
