'use client';

export function InstagramCTA({ whatsappUrl }: { whatsappUrl: string }): React.ReactElement {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
      <button
        onClick={(): void => {
          const formElement = document.getElementById('form-container');
          formElement?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="px-6 py-3 bg-pk-primary text-white font-semibold rounded-lg hover:bg-pk-primary/90 transition-colors"
        type="button"
      >
        Reservar clase de prueba
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 bg-white border-2 border-pk-primary text-pk-primary font-semibold rounded-lg hover:bg-pk-primary/5 transition-colors"
      >
        Hablar por WhatsApp
      </a>
    </div>
  );
}
