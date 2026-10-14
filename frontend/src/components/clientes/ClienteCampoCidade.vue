<script setup lang="ts">
import type { FormularioCliente } from '../../composables/useFormularioCliente'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{ form: FormularioCliente }>()
</script>

<template>
  <!-- Select com as cidades do estado (IBGE). Se a lista não carregar, vira texto livre com aviso. -->
  <CampoFormulario
    v-if="form.cidades.indisponivel.value"
    v-model="form.campos.cidade"
    rotulo="Cidade:"
    obrigatorio
    placeholder="Digite a cidade"
    autocomplete="off"
    aviso="Lista de cidades indisponível no momento. Digite o nome da cidade."
    :maxlength="100"
    :erro="form.erros.cidade"
  />
  <CampoFormulario
    v-else
    v-model="form.campos.cidade"
    rotulo="Cidade:"
    tipo="select"
    obrigatorio
    :placeholder="form.cidades.carregando.value ? 'Carregando cidades...' : 'Selecione a cidade'"
    :desabilitado="form.campos.estado === ''"
    :opcoes="form.cidades.opcoes.value"
    :erro="form.erros.cidade"
  />
</template>
