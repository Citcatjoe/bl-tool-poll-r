/**
 * Envoie un événement au dataLayer pour indiquer qu'une vue a été chargée.
 * @param {string} docId - L'ID du document Firestore.
 */
export function dataLayerPushView(docId) {
  const iframeId = `storytelling_POLL_${docId}`;
  if (window.blickDataLayer) {
    window.blickDataLayer.push({
      event: 'iframe_impression',
      iframe_name: iframeId,
      iframe_id: 'iframe_impression',
    });
    //console.log(`Event "view" pushed for docId: ${docId}`);
  } else {
    //console.error('blickDataLayer is not defined');
  }
  //alert(`Event "view" pushed for docId: ${iframeId}`);
}