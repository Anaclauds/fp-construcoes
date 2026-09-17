-- CreateTable
CREATE TABLE `servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `categoria` ENUM('CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS_RUFOS') NOT NULL,
    `descricao` TEXT NULL,
    `valor_referencia` DECIMAL(12, 2) NOT NULL,
    `unidade_medida` VARCHAR(50) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(180) NOT NULL,
    `categoria` VARCHAR(100) NOT NULL,
    `unidade_medida` VARCHAR(50) NOT NULL,
    `descricao` TEXT NULL,
    `preco_referencia` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    UNIQUE INDEX `uq_material_codigo`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(20) NOT NULL,
    `titulo` VARCHAR(180) NOT NULL,
    `tipo` ENUM('CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS_RUFOS') NOT NULL,
    `cliente_id` INTEGER NOT NULL,
    `data_emissao` DATE NOT NULL,
    `status` ENUM('PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `desconto` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `valor_total` DECIMAL(12, 2) NOT NULL,
    `modalidade_pagamento` ENUM('A_VISTA', 'PARCELADO_MANUAL', 'PARCELADO_AUTOMATICO') NOT NULL DEFAULT 'A_VISTA',
    `numero_parcelas` INTEGER NULL,
    `data_primeiro_vencimento` DATE NULL,

    UNIQUE INDEX `uq_orcamento_numero`(`numero`),
    INDEX `idx_orcamento_cliente`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamento_material` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orcamento_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `valor_unitario` DECIMAL(12, 2) NOT NULL,
    `valor_total` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_orcamento_material_orcamento`(`orcamento_id`),
    INDEX `idx_orcamento_material_material`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamento_servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orcamento_id` INTEGER NOT NULL,
    `servico_id` INTEGER NOT NULL,
    `descricao_adicional` TEXT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `valor_unitario` DECIMAL(12, 2) NOT NULL,
    `valor_total` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_orcamento_servico_orcamento`(`orcamento_id`),
    INDEX `idx_orcamento_servico_servico`(`servico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projeto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orcamento_id` INTEGER NOT NULL,
    `responsavel_id` INTEGER NOT NULL,
    `status` ENUM('PLANEJADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'PLANEJADO',
    `data_inicio` DATE NULL,
    `data_previsao_fim` DATE NULL,
    `data_conclusao` DATE NULL,
    `cidade_obra` VARCHAR(100) NULL,
    `estado_obra` CHAR(2) NULL,
    `rua_obra` VARCHAR(150) NULL,
    `numero_obra` VARCHAR(20) NULL,
    `bairro_obra` VARCHAR(100) NULL,
    `complemento_obra` VARCHAR(150) NULL,

    UNIQUE INDEX `uq_projeto_orcamento`(`orcamento_id`),
    INDEX `idx_projeto_responsavel`(`responsavel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etapa_projeto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `descricao` TEXT NOT NULL,
    `data_registro` DATE NOT NULL,
    `custo_interno_estimado` DECIMAL(12, 2) NULL,
    `valor_cobrado` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_etapa_projeto_projeto`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cobranca` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projeto_id` INTEGER NOT NULL,
    `etapa_id` INTEGER NULL,
    `tipo` ENUM('ENTRADA', 'FINAL', 'MEDICAO') NOT NULL,
    `modalidade` ENUM('A_VISTA', 'PARCELADO_MANUAL', 'PARCELADO_AUTOMATICO') NOT NULL,
    `percentual_referencia` DECIMAL(5, 2) NULL,
    `desconto` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `acrescimo` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `valor_total` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('EM_ABERTO', 'PARCIAL', 'PAGO', 'CANCELADO') NOT NULL DEFAULT 'EM_ABERTO',
    `criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_cobranca_etapa`(`etapa_id`),
    INDEX `idx_cobranca_projeto`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parcela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cobranca_id` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `vencimento` DATE NOT NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('EM_ABERTO', 'PARCIAL', 'PAGA', 'VENCIDA', 'CANCELADA') NOT NULL DEFAULT 'EM_ABERTO',

    UNIQUE INDEX `uq_parcela_cobranca_numero`(`cobranca_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recebimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parcela_id` INTEGER NOT NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `data_recebimento` DATE NOT NULL,
    `forma_pagamento` ENUM('PIX', 'DINHEIRO', 'TRANSFERENCIA', 'CHEQUE', 'CARTAO_CREDITO') NOT NULL,
    `observacoes` TEXT NULL,
    `registrado_por_usuario_id` INTEGER NOT NULL,

    INDEX `idx_recebimento_parcela`(`parcela_id`),
    INDEX `idx_recebimento_usuario_registro`(`registrado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caixa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competencia` DATE NOT NULL,
    `valor_inicial` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('ABERTO', 'FECHADO') NOT NULL DEFAULT 'ABERTO',
    `aberto_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fechado_em` DATETIME(0) NULL,
    `fechado_por_usuario_id` INTEGER NULL,

    UNIQUE INDEX `uq_caixa_competencia`(`competencia`),
    INDEX `idx_caixa_usuario_fechamento`(`fechado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacao_caixa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `caixa_id` INTEGER NOT NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `data` DATE NOT NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(100) NOT NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `recebimento_id` INTEGER NULL,

    UNIQUE INDEX `uq_movimentacao_caixa_recebimento`(`recebimento_id`),
    INDEX `idx_movimentacao_caixa_caixa`(`caixa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orcamento` ADD CONSTRAINT `fk_orcamento_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_material` ADD CONSTRAINT `fk_orcamento_material_orcamento` FOREIGN KEY (`orcamento_id`) REFERENCES `orcamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_material` ADD CONSTRAINT `fk_orcamento_material_material` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_servico` ADD CONSTRAINT `fk_orcamento_servico_orcamento` FOREIGN KEY (`orcamento_id`) REFERENCES `orcamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_servico` ADD CONSTRAINT `fk_orcamento_servico_servico` FOREIGN KEY (`servico_id`) REFERENCES `servico`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto` ADD CONSTRAINT `fk_projeto_orcamento` FOREIGN KEY (`orcamento_id`) REFERENCES `orcamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projeto` ADD CONSTRAINT `fk_projeto_responsavel` FOREIGN KEY (`responsavel_id`) REFERENCES `funcionario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etapa_projeto` ADD CONSTRAINT `fk_etapa_projeto_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobranca` ADD CONSTRAINT `fk_cobranca_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobranca` ADD CONSTRAINT `fk_cobranca_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapa_projeto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parcela` ADD CONSTRAINT `fk_parcela_cobranca` FOREIGN KEY (`cobranca_id`) REFERENCES `cobranca`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recebimento` ADD CONSTRAINT `fk_recebimento_parcela` FOREIGN KEY (`parcela_id`) REFERENCES `parcela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recebimento` ADD CONSTRAINT `fk_recebimento_usuario_registro` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caixa` ADD CONSTRAINT `fk_caixa_usuario_fechamento` FOREIGN KEY (`fechado_por_usuario_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_caixa` ADD CONSTRAINT `fk_movimentacao_caixa_caixa` FOREIGN KEY (`caixa_id`) REFERENCES `caixa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_caixa` ADD CONSTRAINT `fk_movimentacao_caixa_recebimento` FOREIGN KEY (`recebimento_id`) REFERENCES `recebimento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
