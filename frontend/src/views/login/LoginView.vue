<script setup lang="ts">
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { extrairMensagemErro } from '../../services/api'
import logoFp from '../../assets/images/logo-fp.png'

// Visual do frame "LOGIN" (Figma TCC, node 16:75). O usuário de acesso é o CPF.

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const cpf = shallowRef('')
const senha = shallowRef('')
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
          <input
            id="login-senha"
            v-model="senha"
            type="password"
            autocomplete="current-password"
            placeholder="Digite a senha"
            required
          >
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
