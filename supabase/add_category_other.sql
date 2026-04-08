-- À exécuter une fois sur une base déjà créée (avant seulement food, materials, travel).
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'other';
