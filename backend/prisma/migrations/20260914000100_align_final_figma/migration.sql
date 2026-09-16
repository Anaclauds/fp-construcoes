-- Orcamentos passam a guardar prazo e observacoes da tela final.
ALTER TABLE `orcamento`
  ADD COLUMN `prazo_estimado_dias` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `observacoes` TEXT NULL;

-- O default existe apenas para compatibilizar registros anteriores.
ALTER TABLE `orcamento`
  ALTER COLUMN `prazo_estimado_dias` DROP DEFAULT;

-- A aprovacao registra a previsao de inicio separadamente da data efetiva.
ALTER TABLE `projeto`
  ADD COLUMN `previsao_inicio` DATE NULL;

-- Materiais fornecidos pelo cliente sao historicos e nao integram o estoque.
CREATE TABLE `etapa_material_cliente` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `etapa_id` INTEGER NOT NULL,
  `nome` VARCHAR(180) NOT NULL,
  `quantidade` DECIMAL(12, 3) NOT NULL,
  `unidade_medida` VARCHAR(50) NOT NULL,
  INDEX `idx_etapa_material_cliente_etapa` (`etapa_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_etapa_material_cliente_etapa`
    FOREIGN KEY (`etapa_id`) REFERENCES `etapa_projeto` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cobranca`
  ADD COLUMN `percentual_acrescimo` DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE `despesa`
  MODIFY `categoria` ENUM(
    'COMPRA_MATERIAL',
    'COMBUSTIVEL',
    'FERRAMENTA',
    'MANUTENCAO',
    'ALIMENTACAO',
    'MAO_DE_OBRA',
    'ALUGUEL',
    'OUTROS'
  ) NULL;

ALTER TABLE `extra_projeto`
  ADD COLUMN `despesa_id` INTEGER NULL,
  ADD UNIQUE INDEX `uq_extra_projeto_despesa` (`despesa_id`),
  ADD CONSTRAINT `fk_extra_projeto_despesa`
    FOREIGN KEY (`despesa_id`) REFERENCES `despesa` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Divide permissoes antigas sem remover o acesso ja concedido.
INSERT IGNORE INTO `permissao_usuario`
  (`usuario_id`, `modulo`, `pode_visualizar`, `pode_gerenciar`)
SELECT `usuario_id`, 'MATERIAIS', `pode_visualizar`, `pode_gerenciar`
FROM `permissao_usuario`
WHERE `modulo` = 'MATERIAIS_ESTOQUE';

INSERT IGNORE INTO `permissao_usuario`
  (`usuario_id`, `modulo`, `pode_visualizar`, `pode_gerenciar`)
SELECT `usuario_id`, 'ESTOQUE', `pode_visualizar`, `pode_gerenciar`
FROM `permissao_usuario`
WHERE `modulo` = 'MATERIAIS_ESTOQUE';

INSERT IGNORE INTO `permissao_usuario`
  (`usuario_id`, `modulo`, `pode_visualizar`, `pode_gerenciar`)
SELECT `usuario_id`, 'DESPESAS', `pode_visualizar`, `pode_gerenciar`
FROM `permissao_usuario`
WHERE `modulo` = 'FINANCEIRO';

INSERT IGNORE INTO `permissao_usuario`
  (`usuario_id`, `modulo`, `pode_visualizar`, `pode_gerenciar`)
SELECT `usuario_id`, 'CAIXA', `pode_visualizar`, `pode_gerenciar`
FROM `permissao_usuario`
WHERE `modulo` = 'FINANCEIRO';

INSERT IGNORE INTO `permissao_usuario`
  (`usuario_id`, `modulo`, `pode_visualizar`, `pode_gerenciar`)
SELECT `usuario_id`, 'COBRANCAS', MAX(`pode_visualizar`), MAX(`pode_gerenciar`)
FROM `permissao_usuario`
WHERE `modulo` IN ('FINANCEIRO', 'ORCAMENTOS')
GROUP BY `usuario_id`;

DELETE FROM `permissao_usuario`
WHERE `modulo` IN ('MATERIAIS_ESTOQUE', 'FINANCEIRO');
