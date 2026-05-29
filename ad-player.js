// SLT.TPI At A Glance — Ad Player
(function(){
  var AD_INTERVAL=30*60*1000,AD_DURATION=30,SKIP_AFTER=10;
  var style=document.createElement('style');
  style.textContent='#slt-ad-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(8,8,8,0.97);flex-direction:column;align-items:center;justify-content:center;animation:adFadeIn 0.4s ease;}#slt-ad-overlay.active{display:flex;}@keyframes adFadeIn{from{opacity:0}to{opacity:1}}#slt-ad-topbar{position:absolute;top:0;left:0;right:0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;background:rgba(8,8,8,0.8);backdrop-filter:blur(8px);}#slt-ad-label{font-family:monospace;font-size:0.65rem;color:#E8650A;letter-spacing:0.1em;text-transform:uppercase;}#slt-ad-skip-btn{background:none;border:1px solid #444;color:#B8B5AF;padding:6px 14px;border-radius:6px;font-size:0.78rem;cursor:pointer;transition:all 0.3s;}#slt-ad-skip-btn.ready{border-color:#E8650A;color:#F0EDE6;}#slt-ad-skip-btn.ready:hover{background:#E8650A;color:#080808;}#slt-ad-progress-wrap{position:absolute;bottom:0;left:0;right:0;height:3px;background:#222;}#slt-ad-progress-bar{height:3px;background:#E8650A;width:0%;transition:width 1s linear;}#slt-ad-countdown{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:0.72rem;color:#B8B5AF;}';
  document.head.appendChild(style);
  var overlay=document.createElement('div');
  overlay.id='slt-ad-overlay';
  overlay.innerHTML='<div id="slt-ad-topbar"><span id="slt-ad-label">💎 Advertisement</span><button id="slt-ad-skip-btn">Skip in <span id="slt-ad-skip-count">10</span>s</button></div><img id="slt-ad-img" style="display:none;max-width:96vw;max-height:80vh;border-radius:12px;object-fit:contain;"><video id="slt-ad-video" style="display:none;max-width:96vw;max-height:80vh;border-radius:12px;" playsinline autoplay muted></video><div id="slt-ad-progress-wrap"><div id="slt-ad-progress-bar"></div></div><div id="slt-ad-countdown"></div>';
  document.body.appendChild(overlay);
  var skipBtn=document.getElementById('slt-ad-skip-btn');
  var skipCount=document.getElementById('slt-ad-skip-count');
  var progressBar=document.getElementById('slt-ad-progress-bar');
  var countdown=document.getElementById('slt-ad-countdown');
  var adImg=document.getElementById('slt-ad-img');
  var adVideo=document.getElementById('slt-ad-video');
  var adTimer,countTimer,skipTimer,currentAdIdx=0;
  function getActiveAds(){try{var ads=JSON.parse(localStorage.getItem('slt_ads')||'[]');var now=Date.now();return ads.filter(function(a){return a.status==='active'&&a.expiry>now;});}catch(e){return[];}}
  function showAd(){var ads=getActiveAds();if(!ads.length)return;if(currentAdIdx>=ads.length)currentAdIdx=0;var ad=ads[currentAdIdx];currentAdIdx++;if(ad.isVideo){adImg.style.display='none';adVideo.style.display='block';adVideo.src=ad.url;adVideo.play();}else{adVideo.style.display='none';adImg.style.display='block';adImg.src=ad.url;}overlay.classList.add('active');document.body.style.overflow='hidden';skipBtn.classList.remove('ready');skipBtn.disabled=true;skipCount.textContent=SKIP_AFTER;progressBar.style.transition='none';progressBar.style.width='0%';setTimeout(function(){progressBar.style.transition='width '+AD_DURATION+'s linear';progressBar.style.width='100%';},100);var sl=SKIP_AFTER;clearInterval(skipTimer);skipTimer=setInterval(function(){sl--;skipCount.textContent=sl;if(sl<=0){clearInterval(skipTimer);skipBtn.classList.add('ready');skipBtn.disabled=false;skipBtn.innerHTML='Skip Ad ✕';}},1000);clearTimeout(adTimer);adTimer=setTimeout(closeAd,AD_DURATION*1000);var tl=AD_DURATION;clearInterval(countTimer);countTimer=setInterval(function(){tl--;countdown.textContent=tl+'s remaining';if(tl<=0)clearInterval(countTimer);},1000);}
  function closeAd(){overlay.classList.remove('active');document.body.style.overflow='';adVideo.pause();adVideo.src='';adImg.src='';clearTimeout(adTimer);clearInterval(countTimer);clearInterval(skipTimer);progressBar.style.width='0%';countdown.textContent='';}
  skipBtn.addEventListener('click',function(){if(skipBtn.classList.contains('ready'))closeAd();});
  function getNextDelay(){var ads=getActiveAds();if(!ads.length)return null;var base=Math.min.apply(null,ads.map(function(a){return a.uploadTime;}));var now=Date.now();var intervals=Math.floor((now-base)/AD_INTERVAL);return base+(intervals+1)*AD_INTERVAL-now;}
  function scheduleNext(){var delay=getNextDelay();if(delay===null){setTimeout(scheduleNext,5*60*1000);return;}setTimeout(function(){showAd();setTimeout(scheduleNext,AD_DURATION*1000+1000);},delay);}
  document.addEventListener('DOMContentLoaded',function(){scheduleNext();var d=getNextDelay();if(d!==null&&d<60000)setTimeout(showAd,d);});
})();
