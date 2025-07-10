import React from 'react';
import html2canvas from 'html2canvas';

function BtnDownload() {
  const handleDownload = async () => {
    try {
      const answersElement = document.querySelector('#answers');
      if (!answersElement) {
        console.error('Element #answers not found.');
        return;
      }

      await document.fonts.ready; // Wait for all fonts to be loaded
      const canvas = await html2canvas(answersElement, {
        backgroundColor: null, // Transparent background
        scale: 2, // Higher resolution
      });

      const link = document.createElement('a');
      link.download = 'poll-results.png';
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Error generating the image:', error);
    }
  };

  return (
    <button
      id="download"
      className="absolute top-2 right-2 bg-zinc-700 hover:bg-neutral-500 aspect-square h-8 rounded-md px-4"
      title="Télécharger les votes au format PNG"
      onClick={handleDownload} // Attach the click handler
    >
      <img
        src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='11.999'%20height='14'%20viewBox='0%200%2011.999%2014'%3e%3cg%20id='icon-download'%20transform='translate(0%200.004)'%3e%3cg%20id='Groupe_66'%20data-name='Groupe%2066'%20transform='translate(0%20-0.004)'%3e%3cpath%20id='Tracé_24'%20data-name='Tracé%2024'%20d='M257.957,7.356c.032.007.039-.01.057-.029.934-.96,1.818-1.975,2.768-2.917a.738.738,0,0,1,1.026,1.045C260.516,6.789,259.294,8.2,258,9.522c-.367.375-.7.684-1.228.311-1.419-1.446-2.812-2.93-4.176-4.429a.747.747,0,0,1,1.158-.928c.912.926,1.756,1.92,2.663,2.851.018.019.025.036.057.029V.65a1.16,1.16,0,0,1,.1-.3.75.75,0,0,1,1.272-.012,1.149,1.149,0,0,1,.111.308Z'%20transform='translate(-251.213%200.005)'%20fill='%23fff'/%3e%3cpath%20id='Tracé_25'%20data-name='Tracé%2025'%20d='M.671,2515.961l10.622-.005a.745.745,0,0,1,.019,1.488H.685a.744.744,0,0,1-.014-1.482'%20transform='translate(0%20-2503.444)'%20fill='%23fff'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e"
        alt="Télécharger les votes au format PNG"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </button>
  );
}

export default BtnDownload;