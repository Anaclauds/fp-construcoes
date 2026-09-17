-- AlterTable
ALTER TABLE `movimentacao_caixa` ADD COLUMN `despesa_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `despesa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('COMPRA_MATERIAL', 'DIVERSA') NOT NULL,
    `categoria` ENUM('COMPRA_MATERIAL', 'COMBUSTIVEL', 'FERRAMENTA', 'MANUTENCAO', 'ALIMENTACAO', 'MAO_DE_OBRA', 'ALUGUEL', 'OUTROS') NOT NULL,
    `data` DATE NOT NULL,
    `fornecedor_id` INTEGER NULL,
    `descricao` TEXT NOT NULL,
    `valor_total` DECIMAL(12, 2) NOT NULL,
    `registrado_por_usuario_id` INTEGER NOT NULL,

    INDEX `idx_despesa_fornecedor`(`fornecedor_id`),
    INDEX `idx_despesa_usuario_registro`(`registrado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `despesa_material` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `despesa_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `unidade_medida` VARCHAR(50) NOT NULL,
    `valor_unitario` DECIMAL(12, 2) NOT NULL,
    `valor_total` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_despesa_material_despesa`(`despesa_id`),
    INDEX `idx_despesa_material_material`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `uq_movimentacao_caixa_despesa` ON `movimentacao_caixa`(`despesa_id`);

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `fk_movimentacao_estoque_despesa_material` FOREIGN KEY (`despesa_material_id`) REFERENCES `despesa_material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `despesa` ADD CONSTRAINT `fk_despesa_fornecedor` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `despesa` ADD CONSTRAINT `fk_despesa_usuario_registro` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `despesa_material` ADD CONSTRAINT `fk_despesa_material_despesa` FOREIGN KEY (`despesa_id`) REFERENCES `despesa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `despesa_material` ADD CONSTRAINT `fk_despesa_material_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_caixa` ADD CONSTRAINT `fk_movimentacao_caixa_despesa` FOREIGN KEY (`despesa_id`) REFERENCES `despesa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
