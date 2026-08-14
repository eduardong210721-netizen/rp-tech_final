-- El conector como campo de primera clase.
--
-- Hasta ahora el dato que decide la compra vivía disperso: en el nombre del
-- producto ("Cable Apple USB-C a USB-C"), en una spec llamada "Conector", en
-- otra llamada "Cable incluido", en otra "Salidas", o en ninguna parte. Cada
-- producto lo nombraba distinto, así que era imposible filtrar por lo único
-- que el cliente necesita saber: "¿esto entra en mi equipo?".
--
-- Los dos peores errores del catálogo anterior fueron exactamente de este tipo
-- —un cable Lightning que era USB-C, un kit "Tipo C" que traía Micro USB—, así
-- que este dato merece una columna, no una convención.
--
-- `conector` describe el extremo que se enchufa AL EQUIPO DEL CLIENTE, que es
-- la perspectiva desde la que se hace la pregunta.
--
-- `compatibilidad_nota` es el aviso en prosa para cuando el nombre puede
-- inducir a error. Existe porque "Kit Cargador REDD 67W + Cable Micro USB" es
-- correcto y aun así alguien con un celular Tipo C puede comprarlo por error.

alter table public.products
  add column if not exists conector text,
  add column if not exists compatibilidad_nota text;

comment on column public.products.conector is
  'Conector que se enchufa al equipo del cliente: usb-c, lightning, micro-usb, jack-3.5, usb-a, bluetooth, multiple, ninguno';

comment on column public.products.compatibilidad_nota is
  'Aviso corto y explícito cuando el nombre del producto puede inducir a error. Se muestra destacado en la ficha.';

-- Solo valores conocidos. Un conector mal escrito es un producto que
-- desaparece del filtro sin que nadie se entere.
alter table public.products
  drop constraint if exists products_conector_valido;

alter table public.products
  add constraint products_conector_valido check (
    conector is null or conector in (
      'usb-c', 'lightning', 'micro-usb', 'jack-3.5',
      'usb-a', 'bluetooth', 'multiple', 'ninguno'
    )
  );

create index if not exists products_conector_idx on public.products (conector);

-- Datos del catálogo actual. Cada valor sale de la fotografía del producto y
-- de su nombre corregido, no de una suposición.
update public.products p set
  conector = d.conector,
  compatibilidad_nota = d.nota
from (values
  ('26002','bluetooth', null),
  ('26003','jack-3.5',
   'Usa el conector redondo de 3.5 mm. Si tu celular no tiene esa entrada, necesitarás un adaptador.'),
  ('26004','usb-c',
   'Es USB-C en los dos extremos. No sirve para iPhone con entrada Lightning (iPhone 14 o anterior).'),
  ('26005','usb-c', null),
  ('26006','usb-c', null),
  ('26007','micro-usb',
   'El cable que viene en el kit es Micro USB, el conector pequeño y trapezoidal. Si tu equipo usa Tipo C o Lightning, este kit no te sirve.'),
  ('26008','ninguno', null),
  ('26009','usb-a',
   'Se conecta a la computadora con el receptor USB que viene incluido. Se recarga por USB-C.'),
  ('26010','multiple',
   'Tiene salidas Tipo C, Lightning y USB, así que carga casi cualquier equipo. La carga inalámbrica magnética funciona con iPhone compatible con MagSafe.'),
  ('26011','ninguno', null),
  ('26012','usb-a', null)
) as d(sku, conector, nota)
where p.sku = d.sku;
