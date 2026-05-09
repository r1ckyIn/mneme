<!--
  UserBubble.svelte — Plan 01-09 Task 7 NEW component.
  Right-aligned cream-deep bubble (Mneme.html L633-648 `.msg-user .bubble`).

  Visual: 14px radius, 11px/15px padding, max-width 78%, serif body
  14.5px / line-height 1.55, --color-cream-deep background, --color-warm-dark
  text. Plain text only (NO markdown — user prompts are literal text).

  Phase 1 contract: rendered from text content; ChatPanel passes the user's
  prompt verbatim. The `<` / `>` characters are rendered as plain text
  (Svelte's automatic text-content escaping) — NO {@html} site here.
-->
<script lang="ts">
  interface Props {
    text: string;
  }
  let { text }: Props = $props();
</script>

<div class="msg-user">
  <div class="bubble">{text}</div>
</div>

<style>
  /* SSOT: Mneme.html L633-648. */
  .msg-user {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .msg-user .bubble {
    background: var(--color-cream-deep);
    color: var(--color-warm-dark);
    border-radius: 14px;
    padding: 11px 15px;
    font-family: var(--font-serif);
    font-size: 14.5px;
    line-height: 1.55;
    max-width: 78%;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
