        let currentIndex = 0;
        const slider = document.getElementById('slider');
        const slides = slider.children;

        function moveSlider(direction) {
            currentIndex = (currentIndex + direction + slides.length) % slides.length;
            slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        let autoSlide = setInterval(() => moveSlider(1), 6000);

        document.querySelectorAll('.slider-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                clearInterval(autoSlide);
                autoSlide = setInterval(() => moveSlider(1), 6000);
            });
        });