#!/usr/bin/env python3
"""
qiuban.vip 足球数据爬取脚本
用法:
    # 按球队名搜索近7天赛程
    python3 fetch_match.py --search "巴萨"
    python3 fetch_match.py --search "曼联" --days 10

    # 按ID查详情
    python3 fetch_match.py --id 1735655 --type all
    python3 fetch_match.py --id 1735655 --type odds

    # 从URL提取ID
    python3 fetch_match.py --url "https://www.qiuban.vip/forecast.html?id=1735655&rl=ana"

    # 批量查多场
    python3 fetch_match.py --ids 1735655,1734067 --type info
"""

import argparse
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta


BASE_URL = "https://api.qiuban.wang/api"


def fetch_json(path):
    """从 API 获取 JSON 数据"""
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        return None
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None


def parse_id_from_url(url):
    """从 URL 中提取比赛 ID"""
    match = re.search(r'[?&]id=(\d+)', url)
    return match.group(1) if match else None


def date_range(days=7):
    """返回近N天+今天+明天共2*days+1个日期字符串"""
    today = datetime.now()
    dates = []
    for i in range(-days, days + 1):
        d = today + timedelta(days=i)
        dates.append(d.strftime("%Y-%m-%d"))
    return dates


def search_by_team(keyword, days=7):
    """搜索近N天赛程，返回匹配的比赛列表"""
    dates = date_range(days)
    matches = []

    print(f"正在扫描近 {days} 天共 {len(dates)} 天的赛程数据...", file=sys.stderr)
    for date_str in dates:
        data = fetch_json(f"/fixture/schedule/{date_str}")
        if not data or "fixtureList" not in data:
            continue
        for m in data["fixtureList"]:
            home = m.get("homeName", "")
            away = m.get("awayName", "")
            if keyword in home or keyword in away:
                matches.append(m)
        sys.stderr.write(f"\r  已扫描 {date_str}，找到 {len(matches)} 场匹配...")
        sys.stderr.flush()

    sys.stderr.write("\n")
    return matches


def format_match_list(matches, keyword):
    """格式化比赛列表（用于选择）"""
    if not matches:
        return f"未找到包含「{keyword}」的比赛"

    lines = []
    lines.append(f"找到 {len(matches)} 场包含「{keyword}」的比赛：\n")
    for i, m in enumerate(matches, 1):
        status_map = {
            "NS": "未开始", "1H": "上半场", "HT": "半场",
            "2H": "下半场", "ET": "加时", "FT": "完场",
            "P": "点球", "CANC": "取消", "ABD": "腰斩",
            "INT": "中断", "PST": "延期", "TBD": "待定"
        }
        status = status_map.get(m.get("status", ""), m.get("status", "-"))
        score = f"{m.get('goalsHomeTeam', 0)}:{m.get('goalsAwayTeam', 0)}" if m.get("status") == "FT" else "VS"
        lines.append(
            f"  {i}. [{status}] {m.get('eventDate', '')} | "
            f"{m.get('homeName', '-')} vs {m.get('awayName', '-')} | "
            f"{m.get('leagueName', '-')} | ID:{m.get('id', '-')}"
        )
        if m.get("status") == "FT":
            lines[-1] += f" ({score})"

    lines.append(f"\n回复「查第 X 场」或直接发 ID {matches[0]['id']} 获取详情")
    return "\n".join(lines)


def format_info(data):
    """格式化比赛基本信息"""
    if not data:
        return "无数据"

    status_map = {
        "NS": "未开始", "1H": "上半场", "HT": "半场",
        "2H": "下半场", "ET": "加时", "FT": "完场",
        "P": "点球", "CANC": "取消", "ABD": "腰斩",
        "INT": "中断", "PST": "延期", "TBD": "待定"
    }

    lines = []
    lines.append("=" * 50)
    lines.append("【比赛基本信息】")
    lines.append("=" * 50)
    lines.append(f"联赛: {data.get('leagueName', '-')} ({data.get('leagueStage', '')} 第{data.get('leagueRound', '')}轮)")
    lines.append(f"主队: {data.get('homeName', '-')} (排名第{data.get('homeRank', '-')})")
    lines.append(f"客队: {data.get('awayName', '-')} (排名第{data.get('awayRank', '-')})")
    lines.append(f"比赛时间: {data.get('eventDate', '-')}")
    lines.append(f"比分: {data.get('goalsHomeTeam', 0)} : {data.get('goalsAwayTeam', 0)}")
    lines.append(f"状态: {status_map.get(data.get('status', ''), data.get('status', '-'))}")
    lines.append(f"半场比分: {data.get('halfHomeTeam', 0)} : {data.get('halfAwayTeam', 0)}")
    lines.append(f"黄牌: 主{data.get('homeYellow', 0)} / 客{data.get('awayYellow', 0)}")
    lines.append(f"红牌: 主{data.get('homeRed', 0)} / 客{data.get('awayRed', 0)}")
    lines.append(f"角球: 主{data.get('homeCorner', 0)} / 客{data.get('awayCorner', 0)}")
    lines.append(f"比赛ID: {data.get('id', '-')}")

    pred_ids = data.get('prediction', [])
    if pred_ids:
        lines.append(f"\n预测ID [胜平负/让球/进球]: {pred_ids[0] if len(pred_ids) > 0 else '-'} / {pred_ids[1] if len(pred_ids) > 1 else '-'} / {pred_ids[2] if len(pred_ids) > 2 else '-'}")

    return "\n".join(lines)


def format_odds(data):
    """格式化赔率数据"""
    if not data:
        return "无数据"

    lines = []
    lines.append("=" * 50)
    lines.append("【赔率数据】")
    lines.append("=" * 50)

    ou = data.get("oddsOu", {})
    if ou:
        lines.append("\n欧赔（胜平负）:")
        lines.append(f"  初始赔率: 主胜 {ou.get('initial1','-')}  平 {ou.get('initialx','-')}  客胜 {ou.get('initial2','-')}")
        lines.append(f"  即时赔率: 主胜 {ou.get('instant1','-')}  平 {ou.get('instantx','-')}  客胜 {ou.get('instant2','-')}")

    ya = data.get("oddsYa", {})
    if ya:
        lines.append("\n亚盘（让球）:")
        lines.append(f"  初始盘口: {ya.get('initialHandicap','-')}  主水 {ya.get('initialHome','-')}  客水 {ya.get('initialAway','-')}")
        lines.append(f"  即时盘口: {ya.get('instantHandicap','-')}  主水 {ya.get('instantHome','-')}  客水 {ya.get('instantAway','-')}")

    dx = data.get("oddsDx", {})
    if dx:
        lines.append("\n大小球:")
        lines.append(f"  初始盘口: {dx.get('initialHandicap','-')}  大球 {dx.get('initialOver','-')}  小球 {dx.get('initialUnder','-')}")
        lines.append(f"  即时盘口: {dx.get('instantHandicap','-')}  大球 {dx.get('instantOver','-')}  小球 {dx.get('instantUnder','-')}")

    return "\n".join(lines)


def format_prediction(pred_data, pred_type):
    """格式化预测数据"""
    if not pred_data:
        return "预测数据为空"

    res = pred_data.get("res", {})
    tips = pred_data.get("tips", {})

    type_names = {"spf": "胜平负", "yp": "让球", "dx": "进球"}
    type_name = type_names.get(pred_type, pred_type)

    lines = []
    lines.append("=" * 50)
    lines.append(f"【{type_name}预测数据】")
    lines.append("=" * 50)

    if res:
        lines.append(f"\n预测赔率:")
        lines.append(f"  主胜 {res.get('oddsWin','-')}  平 {res.get('oddsDraw','-')}  客胜 {res.get('oddsLose','-')}")
        lines.append(f"  概率:  主胜 {res.get('rateWin','-')}%  平 {res.get('rateDraw','-')}%  客胜 {res.get('rateLose','-')}%")
        sel_map = {0: "主胜", 1: "平局", 2: "客胜", 3: "让球胜", 4: "让球平", 5: "让球负"}
        lines.append(f"  首选: {sel_map.get(res.get('firstSel', '-'), res.get('firstSel', '-'))}")
        lines.append(f"  次选: {sel_map.get(res.get('secondSel', '-'), res.get('secondSel', '-'))}")

    if tips:
        lines.append(f"\n热度: {tips.get('heat','-')}")
        lines.append(f"投注统计: {tips.get('oddsCount','-')} 人")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="qiuban.vip 足球数据爬取")
    parser.add_argument("--search", type=str, help="按球队名搜索比赛（如：巴萨、曼联）")
    parser.add_argument("--days", type=int, default=7, help="搜索近N天赛程（默认7天）")
    parser.add_argument("--id", type=str, help="比赛ID（单个）")
    parser.add_argument("--ids", type=str, help="比赛ID（多个，逗号分隔）")
    parser.add_argument("--url", type=str, help="完整URL，自动提取ID")
    parser.add_argument("--type", type=str, default="all",
                        choices=["info", "odds", "prediction", "all"],
                        help="查询类型: info=基本信息, odds=赔率, prediction=预测, all=全部")
    parser.add_argument("--pred-type", type=str, default="spf",
                        choices=["spf", "yp", "dx"],
                        help="预测类型: spf=胜平负, yp=让球, dx=进球")

    args = parser.parse_args()

    # 搜索模式
    if args.search:
        matches = search_by_team(args.search, args.days)
        print(format_match_list(matches, args.search))
        return

    # 解析 ID
    ids = []
    if args.url:
        extracted = parse_id_from_url(args.url)
        if extracted:
            ids = [extracted]
        else:
            print("无法从URL中提取比赛ID", file=sys.stderr)
            sys.exit(1)
    elif args.id:
        ids = [args.id]
    elif args.ids:
        ids = [i.strip() for i in args.ids.split(",") if i.strip()]
    else:
        print("请提供 --search、--id、--ids 或 --url 参数\n使用 --help 查看更多", file=sys.stderr)
        sys.exit(1)

    # 处理每个 ID
    for idx, match_id in enumerate(ids):
        if idx > 0:
            print("\n" + "-" * 50 + "\n")

        data = fetch_json(f"/fixture/details/{match_id}")
        if not data:
            print(f"无法获取比赛 {match_id} 的数据")
            continue

        if args.type in ("info", "all"):
            print(format_info(data))

        if args.type in ("odds", "all"):
            print(format_odds(data))

        if args.type in ("prediction", "all"):
            pred_ids = data.get("prediction", [])
            if not pred_ids or pred_ids[0] == 0:
                print("\n[提示] 该比赛暂无预测数据或预测已过期")
            else:
                pred_type_map = {"spf": 0, "yp": 1, "dx": 2}
                pid = pred_ids[pred_type_map.get(args.pred_type, 0)]
                if pid == 0:
                    print(f"\n[提示] 该比赛在 {args.pred_type} 玩法下暂无预测")
                else:
                    pred_data = fetch_json(f"/fixture/prediction/{pid}")
                    print(format_prediction(pred_data, args.pred_type))


if __name__ == "__main__":
    main()
