/**
 * Envoie un événement au dataLayer pour un clic sur "Tout voir".
 * @param {string} docId - L'ID du document Firestore.
 */
export function dataLayerPushSeeAllClick(docId) {
  const iframeId = `storytelling_CAL_${docId}`;
  if (window.blickDataLayer) {
    // window.blickDataLayer.push({
    //   event: 'iframe_click',
    //   iframe_name: iframeId,
    //   iframe_id: 'iframe_see_all_clicked',
    // });
    console.log(`Event "see all click" pushed for docId: ${docId}`);
  } else {
    console.error('blickDataLayer is not defined');
  }
}

/**
 * Envoie un événement au dataLayer pour un clic sur un lien global.
 * @param {string} docId - L'ID du document Firestore.
 */
export function dataLayerPushLinkGlobalClick(docId) {
  const iframeId = `storytelling_CAL_${docId}`;
  if (window.blickDataLayer) {
    // window.blickDataLayer.push({
    //   event: 'iframe_click',
    //   iframe_name: iframeId,
    //   iframe_id: 'iframe_link_global_clicked',
    // });
    console.log(`Event "link global click" pushed for docId: ${docId}`);
  } else {
    console.error('blickDataLayer is not defined');
  }
}

/**
 * Envoie un événement au dataLayer pour indiquer qu'une vue a été chargée.
 * @param {string} calendarDoc - L'ID du document Firestore.
 */
export function dataLayerPushView(calendarDoc) {
  const iframeId = `storytelling_CAL_${calendarDoc}`;
  if (window.blickDataLayer) {
    // window.blickDataLayer.push({
    //   event: 'iframe_click',
    //   iframe_name: iframeId,
    //   iframe_id: 'iframe_see_all_clicked',
    // });
    console.log(`Event "view" pushed for calendarDoc: ${calendarDoc}`);
  } else {
    console.error('blickDataLayer is not defined');
  }
}