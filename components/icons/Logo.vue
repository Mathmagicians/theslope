
<template>
  <svg viewBox="20 0 125 60" xmlns="http://www.w3.org/2000/svg" >
    <!-- to hide the path, it is usually wrapped in a <defs> element -->
    <!-- <defs> -->
    <defs/>
    <path
        id="MyPath"
        stroke="#66a28f"
        fill="transparent"
        stroke-width="4"
        d="M 32 26 Q 72 8 81 20 Q 99 23 100 36 Q 105 47 129 59" />
    <!-- </defs> -->

    <text fill="#e54e74" stroke="#a47864" font-size="18">
      <textPath href="#MyPath">SkRåniNgeN</textPath>
    </text>
  </svg>
</template>

<script lang="ts">
export default {
}
</script>
