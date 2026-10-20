<script setup lang="ts">
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { extrairMensagemErro } from '../../services/api'
import { cpfValido } from '../../utils/validacao'
import logoFp from '../../assets/images/logo-fp.png'

// Visual do frame "LOGIN" (Figma TCC, node 16:75). O usuário de acesso é o CPF.

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const cpf = shallowRef('')
const senha = shallowRef('')
const mostrarSenha = shallowRef(false)
const carregando = shallowRef(false)
const erro = shallowRef('')

// Só aceita rota interna existente; bloqueia "//", "/\" e outras formas de ir para outro domínio.
function destinoSeguro(redirect: unknown) {
  const home = { name: 'home' }
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || /[\\\s]/.test(redirect)) return home

  const url = new URL(redirect, window.location.origin)
  if (url.origin !== window.location.origin) return home

  const rota = router.resolve(url.pathname + url.search + url.hash)
  return rota.matched.length > 0 && rota.name !== 'login' && rota.name !== 'naoEncontrada' ? rota.fullPath : home
}

async function entrar() {
  if (carregando.value) return
  if (!cpf.value.trim() || !senha.value) {
    erro.value = 'Preencha o usuário e a senha.'
    return
  }

  // CPF: 11 dígitos, aceitando só a pontuação usual. Letras e tamanhos errados nem chegam à API.
  const digitosCpf = cpf.value.replace(/\D/g, '')
  if (/[^\d.\-\s]/.test(cpf.value) || digitosCpf.length !== 11) {
    erro.value = 'Informe um CPF válido.'
    return
  }
  // Dígitos verificadores errados nem chegam à API. CPF de um dígito só repetido (ex.: o usuário inicial 000.000.000-00
  // do seed) segue para o servidor, que decide: o login do sistema não precisa ser um CPF "de verdade".
  if (!/^(\d)\1{10}$/.test(digitosCpf) && !cpfValido(digitosCpf)) {
    erro.value = 'Informe um CPF válido.'
    return
  }

  carregando.value = true
  erro.value = ''

  try {
    await login(cpf.value, senha.value)
    await router.replace(destinoSeguro(route.query.redirect))
  } catch (e) {
    erro.value = extrairMensagemErro(e)
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="login-pagina">
    <main class="login-conteudo">
      <img
        :src="logoFp"
        class="login-logo"
        alt="FP Construções — Construindo seus sonhos"
      >

      <form
        class="login-formulario"
        novalidate
        @submit.prevent="entrar"
      >
        <header class="login-titulo">
          <h1>Login</h1>
          <p>Preencha os dados do login para acessar</p>
        </header>

        <div class="login-campo">
          <label for="login-cpf">Usuário</label>
          <input
            id="login-cpf"
            v-model="cpf"
            type="text"
            inputmode="numeric"
            autocomplete="username"
            placeholder="Digite o usuário (CPF)"
            required
          >
        </div>

        <div class="login-campo">
          <label for="login-senha">Senha</label>
          <div class="login-senha-controle">
            <input
              id="login-senha"
              v-model="senha"
              :type="mostrarSenha ? 'text' : 'password'"
              class="login-senha-input"
              autocomplete="current-password"
              placeholder="Digite a senha"
              required
            >
            <button
              type="button"
              class="login-senha-alternar"
              :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
              :aria-pressed="mostrarSenha"
              @click="mostrarSenha = !mostrarSenha"
            >
              <svg
                v-if="mostrarSenha"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c5.5 0 9 7 9 7a15.8 15.8 0 0 1-2.2 3.1" />
                <path d="M6.2 6.2C3.8 7.8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        <p
          v-if="erro"
          class="login-erro"
          role="alert"
        >
          {{ erro }}
        </p>

        <button
          type="submit"
          class="login-botao"
          :disabled="carregando"
        >
          <span
            v-if="carregando"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          />
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </main>

    <footer
      class="login-rodape"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.login-pagina {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.login-conteudo {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(32px, 11vw, 191px);
  padding: 32px 24px;
}

.login-logo {
  width: clamp(200px, 34vw, 561px);
  height: auto;
  aspect-ratio: 1;
}

.login-formulario {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.login-titulo {
  margin-bottom: 25px;
  text-align: center;
}

.login-titulo h1 {
  margin: 0;
  color: var(--fp-verde);
  font-size: 32px;
  font-weight: 500;
}

.login-titulo p {
  margin: 0;
  color: var(--fp-texto-suave);
  font-size: 14px;
}

.login-campo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.login-campo label {
  color: var(--fp-texto);
  font-size: 16px;
}

.login-campo input {
  height: 57px;
  padding: 0 22px;
  border: 1px solid var(--fp-texto);
  border-radius: var(--fp-raio);
  background-color: #fff;
  font-size: 20px;
}

.login-senha-controle {
  position: relative;
}

.login-campo .login-senha-input {
  width: 100%;
  padding-right: 58px;
}

.login-senha-alternar {
  position: absolute;
  top: 50%;
  right: 14px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--fp-texto-suave);
  cursor: pointer;
}

.login-senha-alternar:hover {
  color: var(--fp-verde);
}

.login-senha-alternar:focus-visible {
  outline: 2px solid var(--fp-verde);
  outline-offset: 1px;
}

.login-senha-alternar svg {
  width: 22px;
  height: 22px;
}

.login-campo input::placeholder {
  color: var(--fp-texto-suave);
}

.login-campo input:focus {
  outline: none;
  border-color: var(--fp-verde);
  box-shadow: 0 0 0 3px rgba(26, 102, 71, 0.25);
}

.login-erro {
  margin: 4px 0 0;
  color: #b42318;
  font-size: 14px;
}

.login-botao {
  height: 57px;
  margin-top: 16px;
  border: 0;
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.login-botao:hover:not(:disabled) {
  filter: brightness(1.1);
}

.login-botao:focus-visible {
  outline: 3px solid rgba(26, 102, 71, 0.4);
  outline-offset: 2px;
}

.login-botao:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-rodape {
  height: 79px;
  flex-shrink: 0;
  background-color: var(--fp-verde);
}

@media (max-width: 900px) {
  .login-conteudo {
    flex-direction: column;
  }

  .login-logo {
    width: 200px;
  }

  .login-rodape {
    height: 40px;
  }
}
</style>
