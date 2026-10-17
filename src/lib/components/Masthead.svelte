<script lang="ts">
  import { REGIONS, placeName } from '#lib/story.js';
  import { Theme } from '#lib/theme.svelte.js';

  interface Props {
    region: number;
    onpick: (region: number) => void;
  }

  let { region, onpick }: Props = $props();

  const theme = new Theme();
  let postcode = $state('');
  let problem = $state('');
  let looking = $state(false);
  let picker = $state<HTMLElement>();

  function choose(id: number) {
    onpick(id);
    picker?.hidePopover();
  }

  async function find(event: SubmitEvent) {
    event.preventDefault();
    const code = postcode.trim();
    if (!code) return;
    looking = true;
    problem = '';
    try {
      const res = await fetch(`/api/region/${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error();
      const { region: found } = await res.json();
      postcode = '';
      choose(found);
    } catch {
      problem = "Couldn't place that postcode. Try just the first half, like SW1A.";
    } finally {
      looking = false;
    }
  }
</script>

<header class="masthead">
  <a class="mark" href="/" aria-label="carbonara, home">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path class="dial" d="M5 22A12 12 0 1 1 27 22" />
      <path class="needle" d="M16 19L22.5 9.5" />
      <circle cx="16" cy="19" r="2.5" />
    </svg>
    <span>carbonara</span>
  </a>

  <button type="button" class="place" popovertarget="places">
    <svg viewBox="0 0 16 16" aria-hidden="true"
      ><path
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z"
      /></svg
    >
    <span>{placeName(region)}</span>
    <span class="sr-only">, change area</span>
  </button>

  <button
    type="button"
    class="theme"
    onclick={() => theme.flip()}
    aria-label={theme.dark ? 'Switch to light' : 'Switch to dark'}
  >
    <svg viewBox="0 0 20 20" aria-hidden="true">
      {#if theme.dark}
        <circle cx="10" cy="10" r="4" />
        <path
          d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2L16 16M4 16l1.8-1.8M14.2 5.8L16 4"
        />
      {:else}
        <path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z" />
      {/if}
    </svg>
  </button>

  <div id="places" popover bind:this={picker} class="places">
    <form onsubmit={find}>
      <label for="postcode">Your postcode</label>
      <div class="search">
        <input
          id="postcode"
          bind:value={postcode}
          autocomplete="postal-code"
          placeholder="SW1A 1AA"
          maxlength="8"
          spellcheck="false"
        />
        <button type="submit" disabled={looking}>{looking ? 'Looking' : 'Go'}</button>
      </div>
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    </form>
    <p class="or">or pick an area</p>
    <ul>
      {#each [0, ...Object.keys(REGIONS).map(Number)] as id (id)}
        <li>
          <button type="button" aria-pressed={id === region} onclick={() => choose(id)}>
            {placeName(id)}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</header>

<style>
  .masthead {
    display: flex;
    align-items: center;
    gap: var(--space-3) var(--space-4);
    padding: var(--space-3) var(--space-5);
    background: var(--plate);
    border-bottom: var(--hairline) solid var(--rule);
  }

  .mark {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.05rem;
    font-weight: 800;
    font-stretch: var(--wide);
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;

    svg {
      width: 30px;
      fill: var(--ink);
    }

    .dial {
      fill: none;
      stroke: var(--ink);
      stroke-width: 2.5;
      stroke-linecap: round;
    }

    .needle {
      stroke: var(--plan);
      stroke-width: 2.5;
      stroke-linecap: round;
    }
  }

  .place,
  .theme {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius);
    background: var(--plate-sunk);
    font-weight: 600;
    font-stretch: var(--narrow);
    cursor: pointer;

    &:hover {
      border-color: var(--plan);
    }

    svg {
      width: 16px;
      fill: var(--plan);
    }
  }

  .place {
    margin-left: auto;
  }

  .theme {
    justify-content: center;
    width: var(--tap);
    padding: 0;

    svg {
      width: 20px;
      fill: var(--ink);
      stroke: var(--ink);
      stroke-width: 1.6;
      stroke-linecap: round;
    }
  }

  .places {
    position: fixed;
    inset: 64px var(--space-4) auto auto;
    width: min(340px, calc(100vw - 2 * var(--space-4)));
    max-height: calc(100dvh - 80px);
    margin: 0;
    padding: var(--space-4);
    overflow: auto;
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius);
    background: var(--plate);
    color: var(--ink);
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.22);

    label {
      font-weight: 650;
    }

    ul {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    ul button {
      width: 100%;
      min-height: 38px;
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius);
      background: none;
      text-align: left;
      cursor: pointer;

      &:hover {
        background: var(--plate-sunk);
      }

      &[aria-pressed='true'] {
        color: var(--plan);
        font-weight: 700;
      }
    }
  }

  form {
    display: grid;
    gap: var(--space-2);
  }

  .search {
    display: flex;
    gap: var(--space-2);

    input {
      flex: 1;
      min-width: 0;
      min-height: var(--tap);
      padding: 0 var(--space-3);
      border: var(--hairline) solid var(--ink-faint);
      border-radius: var(--radius);
      background: var(--plate-sunk);
      text-transform: uppercase;
    }

    button {
      min-width: 4rem;
      border: 0;
      border-radius: var(--radius);
      background: var(--ink);
      color: var(--plate);
      font-weight: 650;
      cursor: pointer;
    }
  }

  .problem {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }

  .or {
    margin: var(--space-4) 0 var(--space-2);
    color: var(--ink-soft);
    font-size: 0.85rem;
  }

  @media (max-width: 640px) {
    .masthead {
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
    }

    .mark {
      font-size: 0.9rem;
      letter-spacing: 0.04em;
    }

    .place {
      min-width: 0;

      span:not(.sr-only) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
</style>
