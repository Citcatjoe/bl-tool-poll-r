import { useState, useEffect } from 'react'; 
import './App.scss';
import BtnDownload from './components/BtnDownload/BtnDownload';
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay';
//import Calendar from './components/Calendar/Calendar';
import { fetchPollData } from './services/api';
import { dataLayerPushView } from './services/analytics'; 
import { db } from './services/firebase'; // Importez votre instance Firebase
import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore'; // Import des fonctions Firestore
import { CountUp } from 'countup.js';
import html2canvas from 'html2canvas';

function App() {
    const [docId, setDocId] = useState(null);
    const [poll, setPoll] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false); // Nouvel état pour empêcher plusieurs votes
    const [postMode, setPostMode] = useState(false);
    const [loading, setLoading] = useState(true); // Par défaut, l'overlay est visible
    
    // Mode développement : passer à true pour désactiver la protection localStorage
    const [isDev, setIsDev] = useState(false); // Passer à false en production

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const pollDoc = urlParams.get('pollDoc');

        if (!pollDoc) {
            console.log('Aucune poll trouvée.');
            return;
        }

        async function loadPoll() {
            try {
                const data = await fetchPollData(pollDoc);
                setPoll(data);
                setDocId(pollDoc); // Stockez l'ID du document pour les mises à jour
                
                // Incrémenter le compteur de vues
                await incrementCounterViews(pollDoc);
                
                // Envoyer l'événement analytics pour la vue de la poll
                dataLayerPushView(pollDoc);
                
                // Vérifier si l'utilisateur a déjà voté pour cette poll (via localStorage)
                // Seulement si pas en mode développement
                if (!isDev) {
                    const hasVotedKey = `hasVoted_${pollDoc}`;
                    const hasVotedForThisPoll = localStorage.getItem(hasVotedKey) === 'true';
                    
                    if (hasVotedForThisPoll) {
                        setHasAnswered(true);
                        console.log('L\'utilisateur a déjà voté pour cette poll.');
                        // Afficher directement les résultats puisque l'utilisateur a déjà voté
                        setTimeout(() => {
                            displayResults(data);
                        }, 100); // Petit délai pour s'assurer que le DOM est prêt
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la poll:', error);
            } finally {
                setLoading(false); // Masquer l'overlay une fois le chargement terminé
            }
        }

        loadPoll();
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const postModeParam = urlParams.get('postMode'); // Récupère la valeur du paramètre "postMode"

        // Définit le state postMode sur TRUE uniquement si le paramètre est présent et égal à "true"
        setPostMode(postModeParam === 'true');
        
        if (isDev) {
            console.log('🔧 Mode développement activé - Protection localStorage désactivée');
        }
    }, [isDev]);

    useEffect(() => {
        if (postMode && poll) {
            displayResultsInPostMode(poll); // Affiche les résultats sans animations
        }
    }, [postMode, poll]);

    // Calcule le total des votes à partir du tableau de compteurs
    const calculateTotalVotes = (counters) => {
        if (!Array.isArray(counters)) return 0;
        return counters.reduce((total, count) => total + (count || 0), 0);
    };

    // Fonction pour incrémenter le compteur de vues
    const incrementCounterViews = async (pollDoc) => {
        if (!pollDoc) return;

        try {
            const pollRef = doc(db, 'embeds', pollDoc);
            await updateDoc(pollRef, {
                counterViews: increment(1)
            });
            //console.log('Compteur de vues incrémenté');
        } catch (error) {
            //console.error('Erreur lors de l\'incrémentation du compteur de vues:', error);
        }
    };

    // Calcule les pourcentages arrondis à partir du tableau de compteurs
    const calculateRoundedPercentages = (counters) => {
        const totalVotes = calculateTotalVotes(counters);
        if (totalVotes === 0) {
            return counters.map(() => 0);
        }
        let rawPercentages = counters.map((count) => (count / totalVotes) * 100);
        let roundedPercentages = rawPercentages.map(Math.round);
        const difference = 100 - roundedPercentages.reduce((sum, p) => sum + p, 0);
        for (let i = 0; i < Math.abs(difference); i++) {
            const index = rawPercentages.findIndex((value, idx) =>
                difference > 0
                    ? roundedPercentages[idx] < Math.ceil(value)
                    : roundedPercentages[idx] > Math.floor(value)
            );
            if (index !== -1) {
                roundedPercentages[index] += difference > 0 ? 1 : -1;
            }
        }
        return roundedPercentages;
    };

    const displayResults = (updatePoll) => {
        if (!document.querySelector('.App').classList.contains('voted')) {
            document.querySelector('.App').classList.add('voted');
        }
        const totalVotes = calculateTotalVotes(updatePoll.answerCounters);

        document.querySelectorAll('.percent').forEach((el) => {
            el.style.display = 'flex';
        });

        document.querySelectorAll('.percent-value').forEach((el, index) => {
            const targetValue = Math.round(
                ((updatePoll.answerCounters[index] || 0) / totalVotes) * 100
            );
            const countUp = new CountUp(el, targetValue, { duration: 2 });
            if (!countUp.error) {
                countUp.start();
            } else {
                console.error(countUp.error);
            }
        });

        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            const targetWidth = `${Math.round(
                ((updatePoll.answerCounters[index] || 0) / totalVotes) * 100
            )}%`;
            el.style.transition = 'width 2s cubic-bezier(0.19, 1, 0.22, 1)';
            el.style.width = targetWidth;
        });

        // Find the index of the element with the highest width
        const maxIndex = updatePoll.answerCounters.reduce((maxIdx, count, idx, arr) => {
            return arr[maxIdx] < count ? idx : maxIdx;
        }, 0);

        // Update opacity for all .bar-gauge elements
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            el.style.opacity = index === maxIndex ? '1' : '0.5';
        });

        document.querySelectorAll('.percent').forEach((el, index) => {
            el.style.opacity = index === maxIndex ? '1' : '0.5';
        });

        if (totalVotes >= 100) {
            document.getElementById('total-votes').style.opacity = '0.3';
            document.getElementById('total-votes-val').textContent = totalVotes;
        }
        //console.log('Les résultats ont été mis à jour :', updatePoll.answerCounters);
    };

    const displayResultsInPostMode = (updatePoll) => {
        if (!updatePoll || !updatePoll.answerCounters) {
            console.error('Les données de la poll sont invalides.');
            return;
        }
        const totalVotes = calculateTotalVotes(updatePoll.answerCounters);
        document.querySelectorAll('.percent').forEach((el) => {
            el.style.display = 'flex';
        });
        // Met à jour les pourcentages directement sans animation
        document.querySelectorAll('.percent-value').forEach((el, index) => {
            const targetValue = Math.round(
                ((updatePoll.answerCounters[index] || 0) / totalVotes) * 100
            );
            el.textContent = targetValue;
        });
        // Met à jour les barres de progression sans animation
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            const targetWidth = `${Math.round(
                ((updatePoll.answerCounters[index] || 0) / totalVotes) * 100
            )}%`;
            el.style.width = targetWidth;
        });
        // Trouver l'index de l'élément avec le plus de votes
        const maxIndex = updatePoll.answerCounters.reduce((maxIdx, count, idx, arr) => {
            return arr[maxIdx] < count ? idx : maxIdx;
        }, 0);
        // Met à jour la couleur de fond pour tous les éléments .bar-gauge
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            el.style.backgroundColor = index === maxIndex ? '' : '#e0291fff';
        });
        console.log('Les résultats pour le mode Post ont été affichés :', updatePoll.answerCounters);
    };

    const handleAnswerClick = async (answerId) => {

        if (postMode) {
            console.log('Vote impossible en mode post.');
            return; // Empêche plusieurs votes
        }

        // Vérification si l'utilisateur a déjà voté dans cette session
        if (hasAnswered) {
            console.log('Vous avez déjà voté pour cette poll.');
            return; // Empêche plusieurs votes
        }

        if (!docId) return;

        try {
            const pollRef = doc(db, 'embeds', docId);
            // Relire les données actuelles depuis Firestore
            const pollSnapshot = await getDoc(pollRef);
            if (!pollSnapshot.exists()) {
                console.error('Le document de la poll est introuvable.');
                return;
            }
            const currentPoll = pollSnapshot.data();
            const currentCounters = Array.isArray(currentPoll.answerCounters)
                ? currentPoll.answerCounters
                : [];
            // Mettre à jour uniquement le compteur de la réponse cliquée
            const updatedCounters = [...currentCounters];
            updatedCounters[answerId] = (updatedCounters[answerId] || 0) + 1;
            // Mettre à jour answerCounters dans Firestore
            await updateDoc(pollRef, {
                answerCounters: updatedCounters,
            });
            // Mettre à jour l'état local pour refléter les changements
            setPoll((prevPoll) => ({
                ...prevPoll,
                answerCounters: updatedCounters,
            }));
            setHasAnswered(true);
            if (!isDev) {
                const hasVotedKey = `hasVoted_${docId}`;
                localStorage.setItem(hasVotedKey, 'true');
                console.log('Vote enregistré dans localStorage');
            } else {
                console.log('🔧 Mode dev : vote non enregistré dans localStorage');
            }
            // Appeler displayResults après la mise à jour
            displayResults({
                ...currentPoll,
                answerCounters: updatedCounters,
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du document:', error);
        }
    };

    return (
        <div className={`App relative ${postMode ? 'post-mode' : ''}`}>
            {loading && <LoadingOverlay />}
            {postMode && <BtnDownload />}
            <span className="block text-sm w-full label1 mb-2">Donnez votre avis!</span>
            <span className="block antialiased w-full label2 mb-4">
                {poll ? poll.pollTxt : 'Chargement...'}
            </span>

            <ul id="answers">
                {poll && poll.answerTxts ? (
                    (() => {
                        // On suppose que poll.answerCounters existe et a la même longueur
                        const roundedPercentages = calculateRoundedPercentages(poll.answerCounters);
                        return poll.answerTxts.map((txt, index) => {
                            const percent = Math.round(roundedPercentages[index]);
                            return (
                                <li
                                    key={index}
                                    answer-id={`${index}`}
                                    className="answer flex gap-x-2 relative mb-0 cursor-pointer"
                                    onClick={() => handleAnswerClick(index)}
                                >
                                    <span className="relative block bar flex-1 item-center bg-white rounded-md">
                                        {postMode && (
                                            <span className="absolute bar-gauge-bg left-0 right-0 block h-1 bottom-0 rounded-full"></span>
                                        )}
                                        <span className="absolute bar-gauge left-0 block h-1 bottom-0 rounded-full"></span>
                                        <p className="label3 antialiased">{txt}</p>
                                    </span>
                                    <span className="percent absolute top-1/2 -translate-y-1/2">
                                        <span className="percent-value">{percent}</span>% {/* Affiche le pourcentage entier */}
                                    </span>
                                </li>
                            );
                        });
                    })()
                ) : (
                    <li>Chargement des réponses...</li>
                )}
            </ul>
            <span id="total-votes" className="absolute text-xs left-1/2 -translate-x-1/2 bottom-3">
                <span id="total-votes-val"></span>
                <span id="total-votes-txt"> votes</span>
            </span>
        </div>
    );
}

export default App;
