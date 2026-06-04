<script setup>
import { computed, onMounted, ref } from "vue";

const code = ref("");
const status = ref("");
const loading = ref(false);

const apiUrl = computed(() => "http://localhost:3000/utilisateur/verifyMail");

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const prefilledCode = params.get("code");
  if (prefilledCode) {
    code.value = prefilledCode;
  }
});

async function verifyAccount() {
  status.value = "";
  loading.value = true;

  try {
    const response = await fetch(apiUrl.value, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: code.value.trim() }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Impossible de vérifier le compte");
    }

    status.value = payload.message || "Compte vérifié avec succès !";
  } catch (error) {
    status.value = error instanceof Error ? error.message : "Erreur inconnue";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="verification-page">
    <section class="verification-card">
      <p class="eyebrow">Validation de compte</p>
      <h1>Confirme ton adresse mail</h1>
      <p class="lead">
        Entre le code reçu par mail ou clique sur le lien de validation si le
        code est déjà prérempli.
      </p>

      <form class="verification-form" @submit.prevent="verifyAccount">
        <label for="code">Code de vérification</label>
        <input
          id="code"
          v-model="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="Ex. 962888" />
        <button type="submit" :disabled="loading || !code.trim()">
          {{ loading ? "Vérification..." : "Vérifier mon compte" }}
        </button>
      </form>

      <p v-if="status" class="status">{{ status }}</p>
    </section>
  </main>
</template>
