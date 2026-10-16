/* ET Labs Junior media: reveal Design's video/poster only once it loads; otherwise the CSS placeholder stays.
   prefers-reduced-motion: no video, poster image only (if present). */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-jr-media]').forEach(function(box){
    var v=box.querySelector('video.jr-video'); if(!v) return;
    var poster=v.getAttribute('poster');
    if(reduce){
      try{v.pause();}catch(e){}
      v.removeAttribute('autoplay'); v.remove();
      if(!poster) return;
      var img=new Image(); img.className='jr-poster'; img.alt=''; img.decoding='async';
      img.onload=function(){box.appendChild(img);requestAnimationFrame(function(){box.classList.add('is-ready');});};
      img.src=poster; return;
    }
    function ready(){box.classList.add('is-ready');}
    if(v.readyState>=2) ready(); else v.addEventListener('loadeddata',ready,{once:true});
  });
})();
