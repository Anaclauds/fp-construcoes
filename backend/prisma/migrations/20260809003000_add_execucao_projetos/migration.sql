-- AlignProjectWithReferenceModel
ALTER TABLE `projeto`
    CHANGE COLUMN `data_previsao_fim` `previsao_conclusao` DATE NULL,
    ADD COLUMN `cep_obra` CHAR(8) NULL AFTER `data_conclusao`;

-- CreateTable
CREATE TABLE `etapa_servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etapa_id` INTEGER NOT NULL,
    `servico_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `valor_unitario` DECIMAL(12, 2) NULL,
    `custo_interno_estimado` DECIMAL(12, 2) NULL,

    INDEX `idx_etapa_servico_etapa`(`etapa_id`),
    INDEX `idx_etapa_servico_servico`(`servico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extra_projeto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `descricao_justificativa` TEXT NOT NULL,
    `data_registro` DATE NOT NULL,
    `custo_interno_estimado` DECIMAL(12, 2) NULL,

    INDEX `idx_extra_projeto_projeto`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extra_material` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `extra_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `custo_unitario_estimado` DECIMAL(12, 2) NULL,

    INDEX `idx_extra_material_extra`(`extra_id`),
    INDEX `idx_extra_material_material`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extra_servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `extra_id` INTEGER NOT NULL,
    `servico_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `custo_unitario_estimado` DECIMAL(12, 2) NULL,

    INDEX `idx_extra_servico_extra`(`extra_id`),
    INDEX `idx_extra_servico_servico`(`servico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `etapa_servico` ADD CONSTRAINT `fk_etapa_servico_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapa_projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etapa_servico` ADD CONSTRAINT `fk_etapa_servico_servico` FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_projeto` ADD CONSTRAINT `fk_extra_projeto_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_material` ADD CONSTRAINT `fk_extra_material_extra` FOREIGN KEY (`extra_id`) REFERENCES `extra_projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_material` ADD CONSTRAINT `fk_extra_material_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_servico` ADD CONSTRAINT `fk_extra_servico_extra` FOREIGN KEY (`extra_id`) REFERENCES `extra_projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_servico` ADD CONSTRAINT `fk_extra_servico_servico` FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
