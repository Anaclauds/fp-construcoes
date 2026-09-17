-- AlterTable
ALTER TABLE `material` ADD COLUMN `fornecedor_preferencial_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `fornecedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `razao_social` VARCHAR(180) NOT NULL,
    `nome_fantasia` VARCHAR(150) NOT NULL,
    `cnpj` CHAR(14) NOT NULL,
    `contato` VARCHAR(20) NOT NULL,
    `responsavel` VARCHAR(150) NOT NULL,
    `cargo_responsavel` VARCHAR(100) NOT NULL,
    `cep` CHAR(8) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `estado` CHAR(2) NOT NULL,
    `rua` VARCHAR(150) NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `bairro` VARCHAR(100) NOT NULL,
    `complemento` VARCHAR(150) NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    UNIQUE INDEX `uq_fornecedor_cnpj`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estoque_material` (
    `material_id` INTEGER NOT NULL,
    `quantidade_atual` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `quantidade_reservada` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `atualizado_em` DATETIME(0) NOT NULL,

    PRIMARY KEY (`material_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserva_estoque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `orcamento_material_id` INTEGER NULL,
    `extra_material_id` INTEGER NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `status` ENUM('ATIVA', 'CONSUMIDA', 'LIBERADA', 'CANCELADA') NOT NULL DEFAULT 'ATIVA',
    `criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_reserva_estoque_projeto`(`projeto_id`),
    INDEX `idx_reserva_estoque_material`(`material_id`),
    INDEX `idx_reserva_estoque_orcamento_material`(`orcamento_material_id`),
    INDEX `idx_reserva_estoque_extra_material`(`extra_material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacao_estoque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `tipo` ENUM('ENTRADA_COMPRA', 'AJUSTE_ENTRADA', 'AJUSTE_SAIDA', 'RESERVA', 'LIBERACAO_RESERVA', 'BAIXA_PROJETO') NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `data_hora` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `justificativa` TEXT NULL,
    `despesa_material_id` INTEGER NULL,
    `reserva_estoque_id` INTEGER NULL,
    `registrado_por_usuario_id` INTEGER NOT NULL,

    INDEX `idx_movimentacao_estoque_material`(`material_id`),
    INDEX `idx_movimentacao_estoque_despesa_material`(`despesa_material_id`),
    INDEX `idx_movimentacao_estoque_reserva`(`reserva_estoque_id`),
    INDEX `idx_movimentacao_estoque_usuario_registro`(`registrado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_material_fornecedor_preferencial` ON `material`(`fornecedor_preferencial_id`);

-- AddForeignKey
ALTER TABLE `material` ADD CONSTRAINT `fk_material_fornecedor_preferencial` FOREIGN KEY (`fornecedor_preferencial_id`) REFERENCES `fornecedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estoque_material` ADD CONSTRAINT `fk_estoque_material_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_estoque` ADD CONSTRAINT `fk_reserva_estoque_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_estoque` ADD CONSTRAINT `fk_reserva_estoque_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_estoque` ADD CONSTRAINT `fk_reserva_estoque_orcamento_material` FOREIGN KEY (`orcamento_material_id`) REFERENCES `orcamento_material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_estoque` ADD CONSTRAINT `fk_reserva_estoque_extra_material` FOREIGN KEY (`extra_material_id`) REFERENCES `extra_material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `fk_movimentacao_estoque_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `fk_movimentacao_estoque_reserva` FOREIGN KEY (`reserva_estoque_id`) REFERENCES `reserva_estoque`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `fk_movimentacao_estoque_usuario_registro` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
