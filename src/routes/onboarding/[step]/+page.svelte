<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (route-level page)
         + 02-UI-SPEC.md §8.1

  Step router — delegates to Onboarding.svelte with the URL step param
  resolved + clamped to [1..6] by +page.ts `load`. This page is intentionally
  a thin shell so the wizard's state-owner orchestration lives in
  Onboarding.svelte (D-02).
-->
<script lang="ts">
  import Onboarding from "$lib/components/onboarding/Onboarding.svelte";
  let { data } = $props();
</script>

<Onboarding initialStep={data.step} />
