-- DropForeignKey
ALTER TABLE `frequencia` DROP FOREIGN KEY `fk_frequencia_funcionario`;

-- DropForeignKey
ALTER TABLE `frequencia` DROP FOREIGN KEY `fk_frequencia_usuario_registro`;

-- DropForeignKey
ALTER TABLE `permissao_usuario` DROP FOREIGN KEY `fk_permissao_usuario_usuario`;

-- DropForeignKey
ALTER TABLE `usuario` DROP FOREIGN KEY `fk_usuario_funcionario`;

-- CreateTable
CREATE TABLE `cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(180) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `estado` CHAR(2) NOT NULL,
    `tipo` ENUM('PF', 'PJ') NULL,
    `cpf_cnpj` VARCHAR(14) NULL,
    `email` VARCHAR(180) NULL,
    `apelido` VARCHAR(80) NULL,
    `data_nascimento` DATE NULL,
    `sexo` VARCHAR(30) NULL,
    `razao_social` VARCHAR(180) NULL,
    `nome_fantasia` VARCHAR(150) NULL,
    `responsavel` VARCHAR(150) NULL,
    `cargo_responsavel` VARCHAR(100) NULL,
    `cep` CHAR(8) NULL,
    `rua` VARCHAR(150) NULL,
    `numero` VARCHAR(20) NULL,
    `bairro` VARCHAR(100) NULL,
    `complemento` VARCHAR(150) NULL,
    `cadastro_completo` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',

    UNIQUE INDEX `uq_cliente_cpf_cnpj`(`cpf_cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `fk_usuario_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permissao_usuario` ADD CONSTRAINT `fk_permissao_usuario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `frequencia` ADD CONSTRAINT `fk_frequencia_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `frequencia` ADD CONSTRAINT `fk_frequencia_usuario_registro` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
