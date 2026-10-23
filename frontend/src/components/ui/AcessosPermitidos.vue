<script setup lang="ts">
import { useId } from 'vue'
import ToggleFp from './ToggleFp.vue'
import { useModulosAcesso } from '../../composables/useModulosAcesso'
import type { ModuloSistema } from '../../types'
import type { MapaPermissoes } from '../../utils/permissoes'

const props = withDefaults(
  defineProps<{
    /** Somente leitura: toggles desabilitados (modal Visualizar). */
    somenteLeitura?: boolean
    /** Altura total do cartão, com rolagem interna. */
    altura?: string
  }>(),
  { somenteLeitura: false, altura: '359px' },
)

const idTitulo = useId()
const { grupos, carregando, erro, carregar } = useModulosAcesso()
const permissoes = defineModel<MapaPermissoes>({ default: () => ({}) })

function visualizar(modulo: ModuloSistema) {
  return permissoes.value[modulo]?.podeVisualizar ?? false
}

function gerenciar(modulo: ModuloSistema) {
  return permissoes.value[modulo]?.podeGerenciar ?? false
}

// Regra do backend: gerenciar implica visualizar.
function definirVisualizar(modulo: ModuloSistema, ligado: boolean) {
  if (props.somenteLeitura) return
  permissoes.value = {
    ...permissoes.value,
    [modulo]: { podeVisualizar: ligado, podeGerenciar: ligado ? gerenciar(modulo) : false },
  }
}

function definirGerenciar(modulo: ModuloSistema, ligado: boolean) {
  if (props.somenteLeitura) return
  permissoes.value = {
    ...permissoes.value,
    [modulo]: { podeVisualizar: ligado ? true : visualizar(modulo), podeGerenciar: ligado },
  }
}
</script>

<template>
  <section
    class="acessos"
    :style="{ height: altura }"
    :aria-labelledby="idTitulo"
  >
    <h3
      :id="idTitulo"
      class="acessos-titulo"
    >
      Acessos permitidos
    </h3>

    <div class="acessos-miolo">
      <div
        class="acessos-cabecalho"
        aria-hidden="true"
      >
        <span>Módulo</span>
        <span class="acessos-col">Visualizar</span>
        <span class="acessos-col">Gerenciar</span>
      </div>

      <p
        v-if="erro"
        class="acessos-aviso acessos-aviso--erro"
        role="alert"
      >
        {{ erro }}
        <button
          type="button"
          class="acessos-tentar"
          @click="carregar"
        >
          Tentar novamente
        </button>
      </p>
      <p
        v-else-if="carregando && grupos.length === 0"
        class="acessos-aviso"
        role="status"
      >
        Carregando...
      </p>

      <div
        v-else
        class="acessos-lista"
      >
        <div
          v-for="grupo in grupos"
          :key="grupo.rotulo"
          role="group"
          :aria-label="grupo.rotulo"
        >
          <div class="acessos-grupo">
            {{ grupo.rotulo }}
          </div>
          <div
            v-for="item in grupo.modulos"
            :key="item.modulo"
            class="acessos-linha"
          >
            <span class="acessos-nome">{{ item.rotulo }}</span>
            <span class="acessos-col">
              <ToggleFp
                :model-value="visualizar(item.modulo)"
                :rotulo="`Visualizar ${item.rotulo}`"
                :desabilitado="somenteLeitura"
                @update:model-value="definirVisualizar(item.modulo, $event)"
              />
            </span>
            <span class="acessos-col">
              <ToggleFp
                :model-value="gerenciar(item.modulo)"
                :rotulo="`Gerenciar ${item.rotulo}`"
                :desabilitado="somenteLeitura"
                @update:model-value="definirGerenciar(item.modulo, $event)"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.acessos {
  min-height: 200px;

  display: flex;
  flex-direction: column;

  border: 1px solid var(--fp-verde);
  border-radius: 12px;
  background-color: #fff;
  overflow: hidden;
}

.acessos-titulo {
  height: 53px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  margin: 0;
  background-color: var(--fp-verde);

  color: #fff;
  font-size: 21px;
  font-weight: 600;
}

.acessos-miolo {
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 8px;

  padding: 12px 16px 12px;
}

.acessos-cabecalho,
.acessos-linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(100px, 20%, 170px) clamp(100px, 20%, 170px);
  align-items: center;
}

.acessos-cabecalho {
  height: 36px;
  flex-shrink: 0;

  padding: 0 14px;
  border-radius: 12px;
  background-color: var(--fp-verde);

  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.acessos-col {
  display: flex;
  justify-content: center;
}

.acessos-lista {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acessos-lista > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acessos-grupo {
  padding: 5px 14px;
  border-radius: 12px;
  background-color: var(--fp-verde-10);

  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 500;
}

.acessos-linha {
  min-height: 39px;

  padding: 0 14px;
  border: 1px solid var(--fp-verde-20);
  border-radius: 12px;
  background-color: #fff;
}

.acessos-aviso {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  color: var(--fp-texto-titulo-campo);
  font-size: 15px;
}

.acessos-aviso--erro {
  color: var(--bs-danger, #dc3545);
}

.acessos-tentar {
  display: block;
  margin: 8px auto 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 500;
  text-decoration: underline;
}

.acessos-nome {
  color: var(--fp-texto-titulo-campo);
  font-size: 15px;
}

/* Celular: colunas dos interruptores estreitas para o nome do módulo caber (sem colar no interruptor). */
@media (max-width: 575px) {
  .acessos-miolo {
    padding: 10px;
  }

  .acessos-cabecalho,
  .acessos-linha {
    grid-template-columns: minmax(0, 1fr) 68px 68px;
    padding-inline: 10px;
  }

  .acessos-cabecalho {
    font-size: 13px;
  }

  .acessos-nome {
    font-size: 13px;
    padding-right: 6px;
  }

  .acessos-grupo {
    padding-inline: 10px;
    font-size: 14px;
  }
}
</style>
