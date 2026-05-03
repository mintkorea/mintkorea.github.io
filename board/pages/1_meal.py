import streamlit as st
import google.generativeai as genai
from PIL import Image
import datetime
import pandas as pd
from streamlit_gsheets import GSheetsConnection

st.set_page_config(page_title="식단표 AI 관리", layout="wide")
st.title("🍱 식단표 분석 및 단계별 저장")

# 1. 모델 로드 (404 에러 방지 로직)
def load_model():
    try:
        genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
        # v1beta 404 에러를 피하기 위해 명시적 경로 사용
        model_name = 'models/gemini-1.5-flash' 
        model = genai.GenerativeModel(model_name)
        return model, model_name
    except Exception as e:
        return None, str(e)

model, model_name = load_model()

# 세션 상태 초기화 (분석 결과 유지용)
if 'analysis_result' not in st.session_state:
    st.session_state.analysis_result = ""

# 2. UI 레이아웃
uploaded_file = st.file_uploader("식단표 이미지를 업로드하세요", type=['png', 'jpg', 'jpeg'])
title = st.text_input("게시글 제목", placeholder="예: 2026년 5월 1주차 식단표")

if uploaded_file:
    img = Image.open(uploaded_file)
    st.image(img, width=450, caption="업로드된 식단표")

    # --- [1단계: AI 분석 버튼] ---
    if st.button("🔍 1단계: AI 식단 분석 시작"):
        if not title:
            st.warning("제목을 먼저 입력해주세요.")
        else:
            with st.spinner("AI가 메뉴를 읽고 있습니다..."):
                try:
                    # 상세 프롬프트 (짜계치 등 누락 방지)
                    prompt = "이 식단표 이미지에서 날짜별 메뉴를 빠짐없이 추출해서 마크다운 표로 정리해줘. 특히 특식이나 라면류가 있다면 반드시 포함해줘."
                    response = model.generate_content([prompt, img])
                    st.session_state.analysis_result = response.text
                    st.success("분석이 완료되었습니다! 아래에서 내용을 확인하고 수정하세요.")
                except Exception as e:
                    st.error(f"분석 중 에러 발생: {e}\n(API 키와 모델 권한을 확인하세요.)")

# --- [2단계: 결과 확인 및 수동 수정 후 전송] ---
if st.session_state.analysis_result:
    st.divider()
    st.subheader("📋 분석 결과 확인 및 수정")
    
    # 사용자가 직접 수정할 수 있는 공간 (짜계치 등 누락 시 여기서 수정)
    final_content = st.text_area(
        "AI가 분석한 내용입니다. 수정이 필요하면 여기서 고치세요.", 
        value=st.session_state.analysis_result, 
        height=350
    )
    
    if st.button("🚀 2단계: 구글 시트로 최종 전송"):
        with st.spinner("데이터베이스에 저장 중..."):
            try:
                conn = st.connection("gsheets", type=GSheetsConnection)
                existing_df = conn.read(ttl="0")
                
                new_row = pd.DataFrame([{
                    "날짜": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "카테고리": "식단표",
                    "제목": title,
                    "본문내용": final_content,
                    "등록시간": datetime.datetime.now().strftime("%H:%M:%S")
                }])
                
                updated_df = pd.concat([existing_df, new_row], ignore_index=True)
                conn.update(data=updated_df)
                
                st.success("✅ 구글 시트 저장 성공!")
                st.balloons()
            except Exception as e:
                st.error(f"전송 중 에러: {e}")
