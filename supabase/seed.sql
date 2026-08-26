-- ============================================================
-- OPTIONAL: starter products
-- ------------------------------------------------------------
-- Run this AFTER schema.sql if you'd like the shop to open with
-- a few sample listings instead of being empty. You (or your
-- sister, from the admin dashboard) can edit or delete these
-- any time — this is just a head start.
-- ============================================================

insert into public.products (name, description, price, category, tag, rope_colors, charms, sizes, is_active)
values
  ('Miraculous Medal Bracelet',
   'Waterproof wax rope with a Miraculous Medal charm — a First Communion favorite that holds up to everyday wear.',
   16.00, 'catholic', 'Bestseller',
   '{Natural,Black,Navy,"Blush Pink"}', '{"As shown","Miraculous Medal","Saint Benedict Medal",Cross,Dove}', '{Child,Youth,Adult,"Adult XL"}', true),

  ('Saint Benedict Bracelet',
   'A Saint Benedict medal on waterproof wax cord, in your choice of rope color.',
   16.00, 'catholic', null,
   '{Natural,Black,Navy}', '{"As shown","Saint Benedict Medal",Cross}', '{Child,Youth,Adult,"Adult XL"}', true),

  ('First Communion Bracelet',
   'White and gold wax rope with a cross charm — a keepsake gift for the big day.',
   18.00, 'catholic', 'New',
   '{White,"White & Gold"}', '{Cross,"Miraculous Medal"}', '{Child,Youth}', true),

  ('School Spirit Bracelet',
   'Waterproof wax rope in your school colors, finished with an initial charm.',
   14.00, 'school', null,
   '{Natural,Black,Navy,"Multi-color"}', '{"Initial Charm","Mascot Charm","No Charm"}', '{Youth,Adult}', true),

  ('Fully Custom Rope Bracelet',
   'Choose your rope color, charm and add a name — made just for you.',
   20.00, 'custom', null,
   '{Natural,Black,Navy,"Blush Pink","Multi-color"}', '{"Miraculous Medal",Cross,"Initial Charm","Heart Charm","No Charm"}', '{Child,Youth,Adult,"Adult XL"}', true),

  ('Watercolor Saint Print',
   'A hand-painted watercolor portrait, ready to frame as a keepsake gift.',
   28.00, 'watercolor', null,
   '{}', '{}', '{"5×7 Print","8×10 Print",Notecard}', true);
