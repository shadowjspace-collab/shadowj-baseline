{{ define "main" }}
<main style="max-width: 900px; margin: 0 auto; padding: 40px 20px;">

  <!-- 섹션 제목(H1) 절대 삭제 금지: 제목 사라짐 방지 -->
  <h1 style="margin: 0 0 18px 0; font-size: 34px; line-height: 1.2;">
    {{ .Title }}
  </h1>

  <!-- 섹션 설명(있으면 표시) -->
  {{ with .Content }}
    <div style="margin: 0 0 28px 0; opacity: 0.85; line-height: 1.75;">
      {{ . }}
    </div>
  {{ end }}

  {{ $pages := .Pages.ByDate.Reverse }}

  {{ if gt (len $pages) 0 }}
    {{ range $p := $pages }}
      <article style="margin: 0 0 38px 0; padding: 18px 18px; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px;">
        <h2 style="margin: 0 0 10px 0; font-size: 24px; line-height: 1.25;">
          <a href="{{ $p.RelPermalink }}" style="text-decoration: none; color: inherit;">
            {{ $p.Title }}
          </a>
        </h2>

        <!-- 요약/미리보기: Summary가 없으면 본문에서 자동 생성 -->
        {{ $preview := "" }}
        {{ if $p.Summary }}
          {{ $preview = $p.Summary }}
        {{ else }}
          {{ $preview = (truncate 180 $p.Plain) }}
        {{ end }}

        {{ if $preview }}
          <div style="font-size: 16px; line-height: 1.75; opacity: 0.88;">
            {{ $preview }}
          </div>
        {{ end }}

        <div style="margin-top: 10px; font-size: 12px; opacity: 0.6;">
          {{ $p.Date.Format "2006-01-02" }}
        </div>
      </article>
    {{ end }}
  {{ else }}
    <p>아직 글이 없습니다.</p>
  {{ end }}

</main>
{{ end }}
