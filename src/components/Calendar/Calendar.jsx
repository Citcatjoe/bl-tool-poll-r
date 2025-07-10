import React from 'react';
import s from './Calendar.module.scss'; // Import des styles spécifiques au composant via CSS Modules
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../services/firebase'; // Assurez-vous que `db` est correctement exporté depuis votre fichier firebase.js
import LoadingOverlay from '../LoadingOverlay/LoadingOverlay'; // Import du composant LoadingOverlay
import { dataLayerPushSeeAllClick, dataLayerPushLinkGlobalClick } from '../../services/analytics';

async function incrementClickCounter(docId) {
  try {
    const calendarRef = doc(db, 'questions', docId); // Remplacez 'questions' par le nom de votre collection
    await updateDoc(calendarRef, {
      linkGlobalClickCounter: increment(1), // Incrémente la valeur de 1
    });
    //console.log('Compteur de clics incrémenté dans Firestore');
    //dataLayerPushLinkGlobalClick(docId); // Appel de la fonction pour envoyer l'événement au dataLayer
  } catch (error) {
    console.error('Erreur lors de l’incrémentation du compteur :', error);
  }
}

function Calendar({ calendar, docId, showAll, onSeeAllClick }) {
  // Vérification si les données du calendrier sont disponibles
  if (!calendar || !calendar.dates) {
    return <LoadingOverlay />; // Utilisation du composant LoadingOverlay
  }

  // Tri des dates du calendrier par ordre croissant
  const sortedDates = [...calendar.dates].sort((a, b) => a.date.localeCompare(b.date));

  // Déterminer les éléments à afficher :
  // - Si `showAll` est vrai, afficher toutes les dates
  // - Sinon, limiter l'affichage au nombre défini dans `calendar.nbElemsToShow`
  const itemsToDisplay = showAll ? sortedDates : sortedDates.slice(0, calendar.nbElemsToShow);

  return (
    <div className="overflow-auto">
      {/* Liste des événements du calendrier */}
      <ul className="mb-8">
        {itemsToDisplay.map((item, index) => {
          // Extraction de l'année, du mois et du jour à partir de la date
          const [year, month, day] = item.date.split('-');

          // Tableau des noms des mois pour afficher le mois sous forme abrégée
          const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

          return (
            <li key={index} className="flex items-center relative px-1.5 py-1.5">
              {/* Affichage de la date sous forme de jour et mois */}
              <div className={`${s.eventDate} relative w-10 h-10 text-center font-blickb bg-white rounded mr-5 flex-shrink-0`}>
                <span className={`${s.eventDateDay} absolute left-1/2 -translate-x-1/2 text-center text-xl`}>{day}</span>
                <span className={`${s.eventDateMonth} absolute left-1/2 -translate-x-1/2 text-xs`}>{months[parseInt(month) - 1]}</span>
              </div>
              {/* Affichage de l'événement */}
              <span className="grow font-blickb text-sm leading-tight">{item.event}</span>
            </li>
          );
        })}
      </ul>

      {/* Bouton "Tout voir" pour afficher tous les éléments si `showAll` est faux */}
      {!showAll && (
        <span
          id="see-all"
          className="font-i text-sm block w-16 -mt-5 mb-3 opacity-70 cursor-pointer hover:underline float-left"
          onClick={onSeeAllClick} // Appel uniquement de la fonction passée en prop
        >
          Tout voir
        </span>
      )}

      {/* Lien global (si défini dans `calendar`) */}
      {calendar.linkGlobalTxt && (
        <span id="link-global" className="text-right font-i text-sm block -mt-5 mb-3 ml-auto">
          <a
            href={calendar.linkGlobalHref} // URL du lien global
            className="underline text-blick font-semibold"
            target={calendar.linkGlobalNewTab ? '_blank' : '_parent'} // Ouvrir dans un nouvel onglet si `linkGlobalNewTab` est vrai
            onClick={() => {
              incrementClickCounter(docId); // Appel de la fonction Firebase
              dataLayerPushLinkGlobalClick(docId); // Appel de la fonction analytique (push meme sans counter)
            }}
          >
            {calendar.linkGlobalTxt} {/* Texte du lien global */}
          </a>
        </span>
      )}
    </div>
  );
}

export default Calendar; // Export du composant pour l'utiliser dans d'autres parties de l'application