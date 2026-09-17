-- ExpandPaymentMethodsUsedByThePrototype
ALTER TABLE `recebimento`
    MODIFY COLUMN `forma_pagamento` ENUM(
        'PIX',
        'DINHEIRO',
        'TRANSFERENCIA',
        'CHEQUE',
        'CARTAO_CREDITO',
        'CARTAO_DEBITO',
        'BOLETO'
    ) NOT NULL;

-- StoreThePaymentTermsSelectedWhenCreatingTheCharge
ALTER TABLE `cobranca`
    ADD COLUMN `forma_pagamento` ENUM(
        'PIX',
        'DINHEIRO',
        'TRANSFERENCIA',
        'CHEQUE',
        'CARTAO_CREDITO',
        'CARTAO_DEBITO',
        'BOLETO'
    ) NULL AFTER `modalidade`,
    ADD COLUMN `percentual_desconto` DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER `percentual_referencia`;
