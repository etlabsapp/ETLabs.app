/* ET Labs Junior media (Design's 5.6 s seamless loops, 2026-10-14).
   - The poster shows as soon as it loads (the loop's first frame is nearly blank on purpose).
   - The CSS placeholder lockup is only a fallback: it hides once the poster or video loads,
     and stays if the media fails.
   - prefers-reduced-motion: no video, poster image only. */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-jr-media]').forEach(function(box){
    var v=box.querySelector('video.jr-video'); if(!v) return;
    var poster=v.getAttribute('poster');
    function ready(){box.classList.add('is-ready');}
    if(reduce){
      try{v.pause();}catch(e){}
      v.removeAttribute('autoplay'); v.remove();
      if(!poster) return;
      var img=new Image(); img.className='jr-poster'; img.alt=''; img.decoding='async';
      img.onload=function(){box.appendChild(img);requestAnimationFrame(ready);};
      img.src=poster; return;
    }
    if(poster){var p=new Image(); p.onload=ready; p.src=poster;}
    if(v.readyState>=2) ready(); else v.addEventListener('loadeddata',ready,{once:true});
  });
})();
