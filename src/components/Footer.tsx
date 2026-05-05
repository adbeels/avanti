export default function Footer() {
  return (
    <footer className="bg-white dark:bg-black border-t border-amber-200 dark:border-amber-900/30 py-8">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="/a_avanti.png" alt="AVANTI" className="h-16 w-auto" />
          </div>
          <p className="text-slate-600 dark:text-gray-400 mb-2">Sales & Operations</p>
          <p className="text-slate-500 dark:text-gray-500 mb-4">
            Operación Comercial Multicanal en México
          </p>
          <p className="text-slate-400 dark:text-gray-600 text-sm">
            © {new Date().getFullYear()} AVANTI | Sales & Operations. Es una marca registrada de Avanti Incubadora de Marcas, S.A. de C.V. Todos los derechos reservados. Consulta nuestro aviso de privacidad aquí.
          </p>
        </div>
      </div>
    </footer>
  );
}
