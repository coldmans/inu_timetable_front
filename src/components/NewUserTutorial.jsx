import { useEffect } from 'react';

const tutorialSteps = [
  {
    element: '[data-tour="course-search"]',
    popover: {
      title: '먼저 과목을 좁혀요',
      description: '과목명으로 찾고, 학과·구분·요일 필터로 이번 학기에 볼 강의를 빠르게 줄일 수 있어요.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="course-review"]',
    popover: {
      title: '말풍선은 에타 후기',
      description: '말풍선 버튼을 누르면 해당 과목명으로 에브리타임 강의평 검색이 열려요. 교수님이나 과제 분위기를 확인할 때 쓰면 됩니다.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="course-wishlist"]',
    popover: {
      title: '담기는 후보 보관',
      description: '아직 바로 넣을지 애매한 과목은 위시리스트에 담아두세요. 나중에 필수 포함 여부를 정하고 조합을 만들 수 있어요.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="course-add"]',
    popover: {
      title: '추가는 바로 시간표 반영',
      description: '시간이 확정된 과목을 바로 내 시간표에 넣는 버튼이에요.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="wishlist-panel"]',
    popover: {
      title: '담은 과목으로 조합 만들기',
      description: '위시리스트에 후보를 모은 뒤 목표 학점과 공강 요일을 정하면 가능한 시간표 조합을 비교할 수 있어요.',
      side: 'left',
      align: 'start'
    }
  }
];

// data-tour 대상은 데스크톱/모바일 레이아웃에 중복 존재하고 한쪽은 display:none 이므로,
// "존재"가 아니라 "실제로 보이는" 요소를 골라야 스포트라이트가 (0,0)에 찍히지 않는다.
const isVisibleElement = (el) => Boolean(el && (el.offsetWidth > 0 || el.offsetHeight > 0));
const findVisibleTourTarget = (selector) => (
  Array.from(document.querySelectorAll(selector)).find(isVisibleElement) || null
);

const NewUserTutorial = ({ runId, onPrepare, onFinish }) => {
  useEffect(() => {
    if (!runId) return undefined;

    let timeoutId;
    let tourInstance;
    let attempts = 0;
    let cleanedUp = false;

    // 모바일이면 검색 패널을 열고 첫 카드를 펼쳐 투어 대상 버튼을 화면에 노출시킨다.
    onPrepare?.();

    const startTour = async () => {
      const hasCourseActionTargets = tutorialSteps
        .filter(step => step.element.includes('course-') && step.element !== '[data-tour="course-search"]')
        .every(step => findVisibleTourTarget(step.element));
      const availableSteps = tutorialSteps
        .map(step => {
          const target = findVisibleTourTarget(step.element);
          return target ? { ...step, element: target } : null;
        })
        .filter(Boolean);

      if (availableSteps.length === 0) {
        onFinish();
        return;
      }

      if (!hasCourseActionTargets && attempts < 10) {
        attempts += 1;
        timeoutId = window.setTimeout(startTour, 150);
        return;
      }

      let driverFactory;
      try {
        const driverModule = await import('driver.js');
        await import('driver.js/dist/driver.css');
        driverFactory = driverModule.driver;
      } catch (error) {
        console.error('튜토리얼 라이브러리를 불러오지 못했습니다.', error);
        onFinish();
        return;
      }

      if (cleanedUp) return;

      tourInstance = driverFactory({
        animate: true,
        allowClose: true,
        showButtons: ['next', 'previous', 'close'],
        showProgress: true,
        popoverClass: 'inu-tour-popover',
        stagePadding: 8,
        stageRadius: 14,
        overlayOpacity: 0.58,
        nextBtnText: '다음',
        prevBtnText: '이전',
        doneBtnText: '이해했어요',
        progressText: '{{current}}/{{total}}',
        steps: availableSteps,
        onDestroyed: () => {
          if (!cleanedUp) {
            onFinish();
          }
        }
      });

      tourInstance.drive();
    };

    timeoutId = window.setTimeout(startTour, 80);

    return () => {
      cleanedUp = true;
      window.clearTimeout(timeoutId);
      tourInstance?.destroy();
    };
  }, [runId, onPrepare, onFinish]);

  return null;
};

// Timetable components moved to components/TimetableGrid.jsx

export default NewUserTutorial;
