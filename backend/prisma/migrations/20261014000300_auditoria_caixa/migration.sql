CREATE TABLE `auditoria_caixa` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `caixa_id` INTEGER NOT NULL,
  `usuario_id` INTEGER NOT NULL,
  `acao` VARCHAR(30) NOT NULL,
  `ocorrido_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechado_em_anterior` DATETIME(0) NULL,
  `fechado_por_anterior` INTEGER NULL,
  INDEX `idx_auditoria_caixa_caixa` (`caixa_id`),
  INDEX `idx_auditoria_caixa_usuario` (`usuario_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_auditoria_caixa_caixa` FOREIGN KEY (`caixa_id`) REFERENCES `caixa` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_auditoria_caixa_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
