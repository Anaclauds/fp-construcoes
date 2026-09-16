DROP TABLE `usuarios`;

CREATE TABLE `funcionario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome_completo` VARCHAR(150) NOT NULL,
  `apelido` VARCHAR(80) NULL,
  `cpf` CHAR(11) NOT NULL,
  `data_nascimento` DATE NOT NULL,
  `sexo` VARCHAR(30) NOT NULL,
  `celular` VARCHAR(20) NOT NULL,
  `cep` CHAR(8) NOT NULL,
  `cidade` VARCHAR(100) NOT NULL,
  `estado` CHAR(2) NOT NULL,
  `rua` VARCHAR(150) NOT NULL,
  `numero` VARCHAR(20) NOT NULL,
  `bairro` VARCHAR(100) NOT NULL,
  `complemento` VARCHAR(150) NULL,
  `funcao` VARCHAR(100) NOT NULL,
  `setor_atuacao` VARCHAR(100) NOT NULL,
  `salario` DECIMAL(12,2) NOT NULL,
  `tipo_contrato` VARCHAR(40) NOT NULL,
  `data_contratacao` DATE NOT NULL,
  `contato_emergencia` VARCHAR(20) NOT NULL,
  `nome_contato_emergencia` VARCHAR(150) NOT NULL,
  `grau_vinculo` VARCHAR(60) NOT NULL,
  `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_funcionario_cpf` (`cpf`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `usuario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT NOT NULL,
  `login` VARCHAR(50) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
  `ultimo_acesso` DATETIME NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_funcionario` (`funcionario_id`),
  UNIQUE KEY `uq_usuario_login` (`login`),

  CONSTRAINT `fk_usuario_funcionario`
    FOREIGN KEY (`funcionario_id`)
    REFERENCES `funcionario` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `permissao_usuario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `modulo` VARCHAR(80) NOT NULL,
  `pode_visualizar` BOOLEAN NOT NULL DEFAULT FALSE,
  `pode_gerenciar` BOOLEAN NOT NULL DEFAULT FALSE,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissao_usuario_modulo` (`usuario_id`, `modulo`),

  CONSTRAINT `fk_permissao_usuario_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuario` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
