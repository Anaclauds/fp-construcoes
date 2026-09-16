
-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `senha` VARCHAR(255) NOT NULL,
    `perfil` ENUM('ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO') NOT NULL DEFAULT 'FUNCIONARIO',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_cpf_key`(`cpf`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
