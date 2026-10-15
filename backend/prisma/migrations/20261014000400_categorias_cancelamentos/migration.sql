ALTER TABLE `despesa` MODIFY `categoria` VARCHAR(100) NULL,
  ADD COLUMN `cancelado_em` DATETIME(0) NULL;
ALTER TABLE `etapa_projeto` ADD COLUMN `cancelado_em` DATETIME(0) NULL;
ALTER TABLE `extra_projeto` ADD COLUMN `cancelado_em` DATETIME(0) NULL;

CREATE TABLE `categoria_cadastro` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(20) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `rotulo` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `uq_categoria_tipo_nome` (`tipo`, `nome`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `categoria_cadastro` (`tipo`, `nome`, `rotulo`) VALUES
 ('DESPESAS','COMPRA_MATERIAL','Compra de materiais'), ('DESPESAS','SALARIO','Salário'),
 ('DESPESAS','FRETE','Frete'), ('DESPESAS','ALUGUEL','Aluguel'), ('DESPESAS','AGUA','Água'),
 ('DESPESAS','ENERGIA','Energia'), ('DESPESAS','INTERNET','Internet'), ('DESPESAS','TELEFONE','Telefone'),
 ('DESPESAS','COMBUSTIVEL','Combustível'), ('DESPESAS','MANUTENCAO','Manutenção'),
 ('DESPESAS','FERRAMENTA','Ferramenta'), ('DESPESAS','ALIMENTACAO','Alimentação'),
 ('DESPESAS','MAO_DE_OBRA','Mão de obra'), ('DESPESAS','OUTROS','Outros'), ('DESPESAS','EXTRA_PROJETO','Extra de projeto'),
 ('MATERIAIS','Aço e Metais','Aço e Metais'), ('MATERIAIS','Alumínio','Alumínio'),
 ('MATERIAIS','Fixação e Ferragem','Fixação e Ferragem'), ('MATERIAIS','Vedação','Vedação'),
 ('MATERIAIS','Pintura','Pintura'), ('MATERIAIS','Ferramenta','Ferramenta'), ('MATERIAIS','Outros','Outros');
INSERT IGNORE INTO `categoria_cadastro` (`tipo`, `nome`, `rotulo`)
 SELECT DISTINCT 'MATERIAIS', `categoria`, `categoria` FROM `material` WHERE TRIM(`categoria`) <> '';
INSERT IGNORE INTO `categoria_cadastro` (`tipo`, `nome`, `rotulo`)
 SELECT DISTINCT 'DESPESAS', `categoria`, `categoria` FROM `despesa` WHERE `categoria` IS NOT NULL;
UPDATE `despesa` d SET d.`categoria` = CASE WHEN EXISTS (SELECT 1 FROM `extra_projeto` e WHERE e.`despesa_id` = d.`id`) THEN 'EXTRA_PROJETO' ELSE 'OUTROS' END WHERE d.`categoria` IS NULL;

CREATE TABLE `cancelamento_registro` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(20) NOT NULL,
  `registro_id` INTEGER NOT NULL,
  `usuario_id` INTEGER NOT NULL,
  `motivo` VARCHAR(500) NOT NULL,
  `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `movimentacao_id` INTEGER NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_cancelamento_registro` (`tipo`, `registro_id`),
  UNIQUE INDEX `uq_cancelamento_movimentacao` (`movimentacao_id`),
  CONSTRAINT `fk_cancelamento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_cancelamento_movimentacao` FOREIGN KEY (`movimentacao_id`) REFERENCES `movimentacao_caixa` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
