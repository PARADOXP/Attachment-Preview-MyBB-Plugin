var AttachmentPreview = {
  config: {
    lang: {
      preview: 'Preview',
      close: 'Close (Esc)',
      loading: 'Loading preview...'
    },
    maxWidth: 90,
    enhanceThumbs: 1
  },

  imageExts: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],

  attachments: [],
  currentIndex: -1,
  busy: false,

  init: function() {
    if (typeof AttachmentPreviewConfig !== 'undefined') {
      for (var k in AttachmentPreviewConfig) {
        if (AttachmentPreviewConfig.hasOwnProperty(k) && k !== 'bburl') {
          this.config[k] = AttachmentPreviewConfig[k];
        }
      }
    }

    document.documentElement.style.setProperty('--ap-max-width', this.config.maxWidth + 'vw');
    this.buildOverlay();
    this.scan();
    this.bindNavButtons();
    this.bindKeyboard();
    this.bindImageClicks();
    this.bindSwipe();

    var self = this;
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          self.enhanceUploadArea();
          self.collectUploadRows();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  buildOverlay: function() {
    var overlay = document.createElement('div');
    overlay.id = 'ap_overlay';
    overlay.innerHTML =
      '<div id="ap_modal">' +
        '<div class="ap_slide">' +
          '<button id="ap_close" title="' + this.config.lang.close + '">&times;</button>' +
        '</div>' +
        '<div class="ap_loading">' + this.config.lang.loading + '</div>' +
      '</div>' +
      '<button id="ap_prev" class="ap_nav_hidden" title="Previous"></button>' +
      '<button id="ap_next" class="ap_nav_hidden" title="Next"></button>';
    document.body.appendChild(overlay);

    var self = this;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        self.close();
      }
    });

    document.getElementById('ap_close').addEventListener('click', function() {
      self.close();
    });
  },

  bindNavButtons: function() {
    var self = this;
    document.getElementById('ap_prev').addEventListener('click', function(e) {
      e.stopPropagation();
      self.showPrev();
    });
    document.getElementById('ap_next').addEventListener('click', function(e) {
      e.stopPropagation();
      self.showNext();
    });
  },

  bindKeyboard: function() {
    var self = this;
    document.addEventListener('keydown', function(e) {
      var overlay = document.getElementById('ap_overlay');
      if (!overlay.classList.contains('open')) return;

      if (e.key === 'Escape') {
        self.close();
      } else if (e.key === 'ArrowLeft') {
        self.showPrev();
      } else if (e.key === 'ArrowRight') {
        self.showNext();
      }
    });
  },

  bindImageClicks: function() {
    var self = this;
    document.getElementById('ap_modal').addEventListener('click', function(e) {
      if (e.target.tagName !== 'IMG') return;
      if (self.busy || self.attachments.length <= 1) return;
      var rect = e.target.getBoundingClientRect();
      var x = e.clientX - rect.left;
      if (x < rect.width * 0.35) {
        e.stopPropagation();
        self.showPrev();
      } else if (x > rect.width * 0.65) {
        e.stopPropagation();
        self.showNext();
      }
    });
  },

  bindSwipe: function() {
    var self = this;
    var startX = 0;
    var overlay = document.getElementById('ap_overlay');

    overlay.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    overlay.addEventListener('touchend', function(e) {
      if (!overlay.classList.contains('open')) return;
      if (self.busy || self.attachments.length <= 1) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) {
          self.showNext();
        } else {
          self.showPrev();
        }
      }
    }, { passive: true });
  },

  addAttachment: function(url, filename, aid) {
    for (var i = 0; i < this.attachments.length; i++) {
      if (this.attachments[i].aid === aid) return;
    }
    this.attachments.push({url: url, filename: filename, aid: aid});
  },

  scan: function() {
    this.attachments = [];
    this.collectThumbnails();
    this.collectDownloadLinks();
    this.collectUploadRows();
    this.enhanceDownloadLinks();
    this.enhanceThumbnails();
    this.enhanceUploadArea();
  },

  collectThumbnails: function() {
    var self = this;
    var links = document.querySelectorAll('a[href*="attachment.php?aid="]');
    links.forEach(function(link) {
      var img = link.querySelector('img');
      if (!img) return;
      var aidMatch = link.href.match(/aid=(\d+)/);
      if (!aidMatch) return;
      var aid = aidMatch[1];
      var filename = '';
      var title = img.getAttribute('title') || '';
      var m = title.match(/Filename\s*([^\s]+)/i);
      if (m) filename = m[1];
      self.addAttachment(link.href, filename, aid);
    });
  },

  collectDownloadLinks: function() {
    var self = this;
    var links = document.querySelectorAll('.postbit_attachments a[href*="attachment.php?aid="]');
    links.forEach(function(link) {
      var aidMatch = link.href.match(/aid=(\d+)/);
      if (!aidMatch) return;
      var aid = aidMatch[1];
      var filename = link.textContent.trim();
      self.addAttachment(link.href, filename, aid);
    });
  },

  collectUploadRows: function() {
    var self = this;
    var rows = document.querySelectorAll('tr[id^="attachment_"]');
    rows.forEach(function(row) {
      var aid = row.id.replace('attachment_', '');
      if (!aid) return;
      var filenameEl = row.querySelector('.attachment_filename');
      if (!filenameEl) return;
      var filename = filenameEl.textContent.trim();
      var ext = filename.split('.').pop().toLowerCase();
      if (self.imageExts.indexOf(ext) === -1) return;
      var isPm = row.closest('#quickattach_pm_send_upload_area') !== null;
      var url = 'attachment.php?aid=' + aid + (isPm ? '&pm=1' : '');
      self.addAttachment(url, filename, aid);
    });
  },

  enhanceDownloadLinks: function() {
    var self = this;
    var links = document.querySelectorAll('.postbit_attachments a[href*="attachment.php?aid="]');

    links.forEach(function(link) {
      var filename = link.textContent.trim();
      var ext = filename.split('.').pop().toLowerCase();

      if (self.imageExts.indexOf(ext) === -1) return;

      if (link.nextElementSibling && link.nextElementSibling.classList.contains('ap_preview_btn')) return;

      var btn = document.createElement('button');
      btn.className = 'ap_preview_btn';
      btn.textContent = self.config.lang.preview;

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        self.open(link.href, filename);
      });

      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  },

  enhanceThumbnails: function() {
    var self = this;
    if (this.config.enhanceThumbs === 0) return;

    var thumbLinks = document.querySelectorAll('a[href*="attachment.php?aid="]');

    thumbLinks.forEach(function(link) {
      if (!link.querySelector('img')) return;
      if (link.getAttribute('data-ap-enhanced')) return;
      link.setAttribute('data-ap-enhanced', '1');

      link.addEventListener('click', function(e) {
        e.preventDefault();
        var filename = '';

        var img = link.querySelector('img');
        if (img) {
          var title = img.getAttribute('title') || '';
          var m = title.match(/Filename\s*([^\s]+)/i);
          if (m) filename = m[1];
        }

        self.open(link.href, filename);
      });
    });
  },

  enhanceUploadArea: function() {
    var self = this;
    var rows = document.querySelectorAll('tr[id^="attachment_"]');

    rows.forEach(function(row) {
      var aid = row.id.replace('attachment_', '');
      if (!aid) return;

      if (row.querySelector('.ap_preview_btn')) return;

      var filenameEl = row.querySelector('.attachment_filename');
      if (!filenameEl) return;

      var filename = filenameEl.textContent.trim();
      var ext = filename.split('.').pop().toLowerCase();

      if (self.imageExts.indexOf(ext) === -1) return;

      var lastTd = row.querySelector('td:last-child');
      if (!lastTd) return;

      var btn = document.createElement('button');
      btn.className = 'ap_preview_btn';
      btn.textContent = self.config.lang.preview;

      var isPm = row.closest('#quickattach_pm_send_upload_area') !== null;
      var imgUrl = 'attachment.php?aid=' + aid + (isPm ? '&pm=1' : '');

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        self.open(imgUrl, filename);
      });

      lastTd.appendChild(document.createTextNode(' '));
      lastTd.appendChild(btn);
    });
  },

  open: function(url, filename) {
    for (var i = 0; i < this.attachments.length; i++) {
      if (this.attachments[i].url === url) {
        this.showAtIndex(i, 0);
        return;
      }
    }

    this.currentIndex = -1;
    this.firstLoad(url, filename);
  },

  showAtIndex: function(index, direction) {
    if (index < 0 || index >= this.attachments.length || this.busy) return;
    this.currentIndex = index;
    var att = this.attachments[index];

    if (direction) {
      this.busy = true;
      var self = this;
      var img = new Image();
      img.onload = function() {
        self.transitionTo(img, direction);
      };
      img.onerror = function() {
        self.busy = false;
      };
      img.src = att.url;
      img.alt = att.filename || 'Preview';
    } else {
      this.firstLoad(att.url, att.filename);
    }
  },

  transitionTo: function(newImg, direction) {
    var modal = document.getElementById('ap_modal');
    var slide = modal.querySelector('.ap_slide');
    var existingImg = slide.querySelector('img');
    var loadingEl = modal.querySelector('.ap_loading');
    if (loadingEl) loadingEl.style.display = 'none';

    if (existingImg) {
      var outClass = direction > 0 ? 'ap_slide_out_left' : 'ap_slide_out_right';
      slide.classList.add(outClass);

      var self = this;
      setTimeout(function() {
        self.clearSlideImages(slide);
        newImg.style.cursor = 'default';
        slide.appendChild(newImg);
        slide.classList.remove('ap_slide_out_left', 'ap_slide_out_right');

        var inClass = direction > 0 ? 'ap_slide_in_right' : 'ap_slide_in_left';
        slide.classList.add(inClass);
        setTimeout(function() {
          slide.classList.remove('ap_slide_in_right', 'ap_slide_in_left');
        }, 300);

        self.updateNav();
        self.busy = false;
      }, 200);
    } else {
      this.clearSlideImages(slide);
      newImg.style.cursor = 'default';
      slide.appendChild(newImg);
      this.updateNav();
      this.busy = false;
    }
  },

  clearSlideImages: function(slide) {
    var imgs = slide.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].parentNode) imgs[i].parentNode.removeChild(imgs[i]);
    }
  },

  firstLoad: function(url, filename) {
    if (this.busy) return;

    var overlay = document.getElementById('ap_overlay');
    var modal = document.getElementById('ap_modal');
    var loadingEl = modal.querySelector('.ap_loading');

    this.busy = true;

    overlay.classList.add('open');

    if (loadingEl) {
      loadingEl.textContent = this.config.lang.loading;
      loadingEl.style.color = '#555';
      loadingEl.style.display = '';
    }

    var slide = modal.querySelector('.ap_slide');
    this.clearSlideImages(slide);

    var self = this;
    var img = new Image();
    img.onload = function() {
      if (loadingEl) loadingEl.style.display = 'none';
      img.style.cursor = 'default';
      self.clearSlideImages(slide);
      slide.appendChild(img);
      self.busy = false;
      self.updateNav();
    };
    img.onerror = function() {
      self.busy = false;
      if (loadingEl) {
        loadingEl.textContent = 'Failed to load image.';
        loadingEl.style.color = '#c00';
      }
    };
    img.src = url;
    img.alt = filename || 'Preview';
  },

  showPrev: function() {
    if (this.currentIndex > 0) {
      this.showAtIndex(this.currentIndex - 1, -1);
    }
  },

  showNext: function() {
    if (this.currentIndex < this.attachments.length - 1) {
      this.showAtIndex(this.currentIndex + 1, 1);
    }
  },

  updateNav: function() {
    var prev = document.getElementById('ap_prev');
    var next = document.getElementById('ap_next');
    if (!prev || !next) return;

    if (this.currentIndex <= 0 || this.attachments.length <= 1) {
      prev.classList.add('ap_nav_hidden');
    } else {
      prev.classList.remove('ap_nav_hidden');
    }

    if (this.currentIndex >= this.attachments.length - 1 || this.attachments.length <= 1) {
      next.classList.add('ap_nav_hidden');
    } else {
      next.classList.remove('ap_nav_hidden');
    }
  },

  close: function() {
    var overlay = document.getElementById('ap_overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
    this.busy = false;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    AttachmentPreview.init();
  });
} else {
  AttachmentPreview.init();
}
