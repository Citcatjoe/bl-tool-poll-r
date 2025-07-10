import React from 'react';
//import s from './Titlebar.module.scss';

function Titlebar({ calName }) {
  return (
    <div className="px-5 py-7">
      <span id="title" className="font-blickb text-xl leading-none uppercase antialiased pl-2.5 border-l-2 border-blick block ">
      {calName || 'Loading...'}
      </span>
    </div>
  );
}

export default Titlebar; 