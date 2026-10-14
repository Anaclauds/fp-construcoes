<script setup lang="ts">
import type { FormularioCliente } from '../../composables/useFormularioCliente'
import { mascararTelefone } from '../../utils/formatadores'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ClienteCampoCidade from './ClienteCampoCidade.vue'

defineProps<{
  form: FormularioCliente
  /** Grade de duas colunas (edição); sem isso os campos ficam empilhados (modal de cadastro rápido). */
  grade?: boolean
}>()
</script>

<template>
  <!-- Nome, telefone, estado e cidade: o que um cliente de cadastro rápido tem. -->
  <div
    class="campos-rapidos"
    :class="{ 'campos-rapidos--grade': grade }"
  >
    <CampoFormulario
      v-model="form.campos.nome"
      class="rapido-nome"
      rotulo="Nome:"
      obrigatorio
      placeholder="Digite o nome do cliente"
      autocomplete="off"
      :maxlength="180"
      :erro="form.erros.nome"
    />
    <CampoFormulario
      v-model="form.campos.celular"
      class="rapido-telefone"
      rotulo="Telefone:"
      obrigatorio
      placeholder="(00) 00000-0000"
      inputmode="tel"
      :mascara="mascararTelefone"
      :erro="form.erros.celular"
    />
    <CampoFormulario
      :model-value="form.campos.estado"
      class="rapido-estado"
      rotulo="Estado:"
      tipo="select"
      obrigatorio
      :placeholder="grade ? 'UF' : 'Selecione o estado'"
      :opcoes="form.opcoes.value.estado"
      :erro="form.erros.estado"
      @update:model-value="form.aoMudarEstado"
    />
    <ClienteCampoCidade
      class="rapido-cidade"
      :form="form"
    />
  </div>
</template>

<style scoped>
.campos-rapidos {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.campos-rapidos--grade {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px 16px;
}

.campos-rapidos--grade .rapido-nome {
  grid-column: span 12;
}

.campos-rapidos--grade .rapido-telefone {
  grid-column: span 4;
}

.campos-rapidos--grade .rapido-estado {
  grid-column: span 3;
}

.campos-rapidos--grade .rapido-cidade {
  grid-column: span 5;
}

@media (max-width: 700px) {
  .campos-rapidos--grade {
    grid-template-columns: 1fr;
  }

  .campos-rapidos--grade > * {
    grid-column: 1 / -1;
  }
}
</style>
