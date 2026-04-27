import "./MenuBoardSlider.css";
import React, { useState } from "react";
import MenuBoard from "./MenuBoard.jsx";
import TopTenPage from "./TopTenPage.jsx";

const TOTAL_PAGES = 2;

function MenuBoardSlider() {
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <div className="mb-board">
      <div className="mb-carousel">
        <button
          className="mb-arrow"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ‹
        </button>

        <div className="mb-track-wrapper">
          <div
            className="mb-track"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            <div className="mb-slide">
              <MenuBoard />
            </div>

            <div className="mb-slide">
              <TopTenPage />
            </div>

          </div>
        </div>

        <button
          className="mb-arrow"
          onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))}
          disabled={currentPage === TOTAL_PAGES - 1}
        >
          ›
        </button>
      </div>

      <div className="mb-dots">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <button
            key={i}
            className={`mb-dot${currentPage === i ? " active" : ""}`}
            onClick={() => setCurrentPage(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default MenuBoardSlider;