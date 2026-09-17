CREATE TABLE `frequencia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT NOT NULL,
  `data` DATE NOT NULL,
  `status` ENUM(
    'PRESENTE',
    'MEIO_PERIODO',
    'FALTA_JUSTIFICADA',
    'FALTA_NAO_JUSTIFICADA'
  ) NOT NULL,
  `observacao` TEXT NULL,
  `registrado_por_usuario_id` INT NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_frequencia_funcionario_data` (`funcionario_id`, `data`),
  KEY `idx_frequencia_usuario_registro` (`registrado_por_usuario_id`),

  CONSTRAINT `fk_frequencia_funcionario`
    FOREIGN KEY (`funcionario_id`)
    REFERENCES `funcionario` (`id`),

  CONSTRAINT `fk_frequencia_usuario_registro`
    FOREIGN KEY (`registrado_por_usuario_id`)
    REFERENCES `usuario` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
