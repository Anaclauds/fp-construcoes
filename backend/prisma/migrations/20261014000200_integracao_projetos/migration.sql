ALTER TABLE `etapa_servico` ADD COLUMN `descricao` VARCHAR(1000) NULL;
ALTER TABLE `extra_servico` ADD COLUMN `descricao` VARCHAR(1000) NULL;

CREATE TABLE `extra_gasto_avulso` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `extra_id` INTEGER NOT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `valor` DECIMAL(12,2) NOT NULL,
  INDEX `idx_extra_gasto_avulso_extra` (`extra_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_extra_gasto_avulso_extra` FOREIGN KEY (`extra_id`) REFERENCES `extra_projeto` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
