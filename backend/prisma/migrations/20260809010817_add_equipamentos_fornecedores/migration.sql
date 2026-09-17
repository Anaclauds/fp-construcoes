-- CreateTable
CREATE TABLE `equipamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_patrimonial` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `tipo` VARCHAR(80) NOT NULL,
    `marca` VARCHAR(80) NOT NULL,
    `modelo` VARCHAR(80) NULL,
    `observacoes` TEXT NULL,
    `data_aquisicao` DATE NULL,
    `valor_aquisicao` DECIMAL(12, 2) NULL,
    `fornecedor_id` INTEGER NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    UNIQUE INDEX `uq_equipamento_codigo_patrimonial`(`codigo_patrimonial`),
    INDEX `idx_equipamento_fornecedor`(`fornecedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `equipamento` ADD CONSTRAINT `fk_equipamento_fornecedor` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
